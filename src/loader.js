// import 'core-js/fn/object/assign'
import WebFont from 'webfontloader'
import fileType from 'file-type'
import supportsWoff2 from 'woff2-feature-test'


function load(config = {}) {
    const savedFonts = localStorage in window ? JSON.parse(localStorage.getItem('saved-fonts')) : null;
    if (savedFonts && savedFonts.length) {
        setFonts(savedFonts);
    } else {
        WebFont.load({...config, active: parseStyleTags});
    }
}

function parseStyleTags() {
    const inlineStyleSheets = [...document.styleSheets].filter(tag => tag.href === null);
    let rules = [];
    inlineStyleSheets.forEach(tag => rules.push(...tag.rules));
    //TODO check if woff, or woff2 is supported
    rules = rules.filter(rule => rule instanceof CSSFontFaceRule);
    rules = [].concat(...rules.map(rule => parseRules(rule)));
    //TODO better check for empty or missing url arrays
    rules = rules.filter(rule => rule);
    const promises = rules.map(rule => loadFont(rule));
    Promise.all(promises).then(onFontsLoaded)
}

function onFontsLoaded(fonts) {
    const usedFonts = fonts.map(font => font.name);
    Promise
        .all(fonts.map(font => saveFont(font)))
        .then(() => localStorage.setItem('saved-fonts', JSON.stringify(usedFonts)))
        .catch(error => console.error(error));
}

function parseRules(rule) {
    const nameRegex = /font-family:\s?['"]?(.*?)['"]?;/g;
    const name = nameRegex.exec(rule.cssText);
    const urlRegex = /url\(["']?(\S*?)["']?\)/g;
    const url = urlRegex.exec(rule.cssText);
    return (name && name[1] && url && url[1]) ? {name: name[1], url: url[1]} : null;
}

function loadFont({name, url}) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                const reader = response.body.getReader();
                reader.read().then(({done, value}) => {
                    resolve({name, buffer: value});
                });
            })
            .catch(error => console.error(error));
    })
}

function saveFont(font) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([font.buffer], {type: fileType(font.buffer).mime});
        const reader = new FileReader();
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
    setStyleTag(base64String);
}

function setStyleTag(base64String) {
    const style = document.createElement('style');
    style.rel = 'stylesheet';
    style.textContent = `@font-face {font-family: font-name;  src: url(${base64String});}`;
    document.head.appendChild(style);
}

export {load};