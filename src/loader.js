import 'core-js/fn/object/assign'
import WebFont from 'webfontloader'
import fileType from 'file-type'
import supportsWoff2 from 'woff2-feature-test'

function load(config = {}, version = 0, log = false) {
    return new Promise((resolve, reject) => {
        const savedFonts = localStorage ? JSON.parse(localStorage.getItem('saved-fonts')) : null;
        const savedFontsVersion = localStorage ? localStorage.getItem('saved-fonts-version') : null;
        if (savedFonts && savedFonts.length && version.toString() === savedFontsVersion) {
            log && console.log(`Get Fonts from Local Storage, Version ${savedFontsVersion}`);
            setFonts(savedFonts);
            resolve();
        } else {
            log && console.log(`Load Fonts, Version ${version}`);
            WebFont.load({
                ...config, active: () => {
                    parseStyleTags(version);
                    resolve();
                },
            });
        }
    });
}

function parseStyleTags(version) {
    const docStyleSheets = document.styleSheets;
    const styleSheets = [...docStyleSheets];
    let rules = [];
    styleSheets.forEach(tag => {
        if (tag.rules) rules.push(...tag.rules)
    });
    rules = rules.filter(rule => rule instanceof CSSFontFaceRule);
    rules = [].concat(...rules.map(rule => parseRules(rule)));
    rules = rules.map(rule => setPreferedFont(rule));
    rules = rules.filter(rule => rule);
    Promise
        .all(rules.map(rule => loadFont(rule).catch(() => undefined)))
        .then(fonts => fonts.filter(font => !!font))
        .then(fonts => onFontsLoaded(fonts, version));
}

function onFontsLoaded(fonts, version) {
    return Promise
        .all(fonts.map(font => saveFont(font).catch(() => undefined)))
        .then(fonts => fonts.filter(font => !!font))
        .then(() => {
            const usedFonts = fonts.map(font => font.name);
            localStorage.setItem('saved-fonts', JSON.stringify(usedFonts));
            localStorage.setItem('saved-fonts-version', version);
        })
        .catch(error => console.error(error));
}

function parseRules(rule) {
    const fonts = [];
    const nameRegex = /font-family:\s?['"]?(.*?)['"]?;/g;
    const weightRegex = /font-weight:\s?['"]?(.*?)['"]?;/g;
    const styleRegex = /font-style:\s?['"]?(.*?)['"]?;/g;
    const urlRegex = /url\(["']?(\S*?)["']?\)/g;
    const formatRegex = /format\(["']?(.*?)["']?\)/g;

    const name = nameRegex.exec(rule.cssText);

    if (!name || !name[1]) return null;

    let url;
    let format;
    while ((url = urlRegex.exec(rule.cssText)) && (format = formatRegex.exec(rule.cssText))) {
        const weight = weightRegex.exec(rule.cssText);
        const style = styleRegex.exec(rule.cssText);
        fonts.push({
            url: url[1],
            format: format[1],
            weight: weight ? weight[1] : 'normal',
            style: style ? style[1] : 'normal',
        })
    }

    return {name: name[1], fonts};
}

function setPreferedFont(rule) {
    const woff2 = rule.fonts.find(font => font.format === 'woff2');
    if (supportsWoff2 && woff2) {
        return {
            name: addWeightAndStyleToName(rule, woff2),
            url: woff2.url,
        }
    }

    const woff = rule.fonts.find(font => font.format === 'woff');
    if (woff) {
        return {
            name: addWeightAndStyleToName(rule, woff),
            url: woff.url,
        }
    }

    rule.fonts.forEach(font => console.warn(`Font format "${font.format}" is not supported`));
    return null;
}

function addWeightAndStyleToName(rule, font) {
    return `${rule.name};${font.weight};${font.style}`
}

function loadFont({name, url}) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(checkStatus)
            .then(response => {
                const reader = response.body.getReader();
                reader.read().then(({done, value}) => {
                    resolve({name, buffer: value});
                });
            })
            .catch(error => reject(error));
    })
}

function checkStatus(res) {
    if (res.status >= 200 && res.status < 400) {
        return res
    }

    const err = new Error(res.statusText);
    err.response = res;
    throw err;
}

function saveFont(font) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([font.buffer], {type: fileType(font.buffer).mime});
        if (!font.buffer || !fileType(font.buffer).mime) {
            reject(new Error('buffer or mimetype is undefined'));
        }

        const reader = new FileReader();
        reader.onerror = error => reject(error);
        reader.onload = event => {
            const base64 = event.target.result;
            localStorage.setItem(font.name, base64);
            resolve();
        };

        reader.readAsDataURL(blob);
    });
}

function setFonts(savedFonts) {
    savedFonts.forEach(font => readFont(font));
}

function readFont(font) {
    const base64String = localStorage.getItem(font);
    setStyleTag(font, base64String);
}

function setStyleTag(font, base64String) {
    const [name, weight, style] = font.split(';');
    const styleTag = document.createElement('style');
    styleTag.rel = 'stylesheet';
    styleTag.textContent = `@font-face {font-family: ${name}; font-weight: ${weight}; font-style: ${style}; src: url(${base64String});}`;
    document.head.appendChild(styleTag);
}

export {load};