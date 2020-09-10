fs = require('fs');

let translationDir = 'lemmy-translations/translations/';
let outDir = 'src/shared/translations/';
fs.mkdirSync(outDir, { recursive: true });
fs.readdir(translationDir, (err, files) => {
  files.forEach(filename => {
    const lang = filename.split('.')[0];
    try {
      const json = JSON.parse(
        fs.readFileSync(translationDir + filename, 'utf8')
      );
      var data = `export const ${lang} = {\n  translation: {`;
      for (var key in json) {
        if (key in json) {
          const value = json[key].replace(/"/g, '\\"');
          data = `${data}\n    ${key}: "${value}",`;
        }
      }
      data += '\n  },\n};';
      const target = outDir + lang + '.ts';
      fs.writeFileSync(target, data);
    } catch (err) {
      console.error(err);
    }
  });
});
