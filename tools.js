document.addEventListener("DOMContentLoaded", () => {

  /* INTERNAL TOOLS */

  const internalTools = [
    { name: "Sun Ray Generator", file: "tools/sun_rays/sun_rays.html" },
    { name: "Stone Texture Generator", file: "tools/stone/stone.html" },
    { name: "Comic Burst Generator", file: "tools/comic_burst/comic_burst.html" },
    { name: "Mountain Range Generator", file: "tools/mount_range/mount_range.html" },
    { name: "Planogram Generator", file: "tools/planogram/planogram.html" }
  ];

  const toolsContainer = document.getElementById("tools-container");

  if (toolsContainer) {
    internalTools.forEach(tool => {
      const box = document.createElement("div");
      box.className = "tool-box";
      box.innerHTML = `
        <h3>${tool.name}</h3>
        <a href="${tool.file}" class="btn">Open Tool</a>
      `;
      toolsContainer.appendChild(box);
    });
  }


  /* EXTERNAL TOOLS (CATEGORIZED)*/

  const externalToolCategories = {

    "Image Editing": [
      { name: "Photopea", url: "https://www.photopea.com/" },
      { name: "Image Lightener", url: "https://pinetools.com/lighten-image" },
      { name: "Image Darkener", url: "https://pinetools.com/darken-image" },
      { name: "Color Inverter", url: "https://pinetools.com/invert-image-colors" },
      { name: "Image Resizer", url: "https://promo.com/tools/image-resizer/" },
      { name: "Image Merger", url: "https://pinetools.com/merge-images" },
      { name: "Image Divider", url: "https://www.imgonline.com.ua/eng/cut-photo-into-pieces.php" },
      { name: "Image Pixelater", url: "https://www.scenario.com/features/pixelate/" },
      { name: "Photo Enhancer", url: "https://www.cutout.pro/photo-enhancer-sharpener-upscaler" },
      { name: "Watermark Remover", url: "https://www.watermarkremover.io/upload" },
      { name: "Photo Collage Maker", url: "https://www.photocollage.com/" },
    ],

    "Text Editing & Writing": [
      { name: "Word Counter", url: "https://wordcounter.net/" },
      { name: "ASCII Art Generator", url: "https://convertcase.net/ascii-art-generator/" },
      { name: "Zalgo Text Generator", url: "https://convertcase.net/glitch-text-converter/" },
      { name: "Line Break Remover", url: "https://www.textfixer.com/tools/remove-line-breaks.php" },
      { name: "Letters and Characters Remover", url: "https://convertcase.net/letter-character-removal-tool/" },
      { name: "Text Formatting Remover", url: "https://convertcase.net/remove-text-formatting/" },
      { name: "Duplicate Word Finder", url: "https://convertcase.net/duplicate-word-finder/" },
      { name: "Alphabetical Word Sorter", url: "https://convertcase.net/sort-alphabetically/" },
      { name: "Sentence Counter", url: "https://convertcase.net/online-sentence-counter/" },
      { name: "Word Frequency Counter", url: "https://convertcase.net/word-frequency-counter/" },
      { name: "Font Identifier", url: "https://www.myfonts.com/pages/whatthefont" },  
    ],

    "Text Converting": [
      { name: "Text From Image Extractor", url: "https://www.imagetotext.info/" },
      { name: "Text Case Converter", url: "https://convertcase.net/" },
      { name: "ASCII Art Generator", url: "https://convertcase.net/ascii-art-generator/" },
      { name: "Zalgo Text Generator", url: "https://convertcase.net/glitch-text-converter/" },
      { name: "Aesthetic Text Generator", url: "https://convertcase.net/aesthetic-text-generator/" },
      { name: "Big Text Converter", url: "http://convertcase.net/big-text-generator/" },
      { name: "Bold Text Generator", url: "https://convertcase.net/bold-text-converter/" },
      { name: "Bubble Text Generator", url: "https://convertcase.net/bubble-text-generator/" },
      { name: "Cursed Text Converter", url: "https://convertcase.net/cursed-text/" },
      { name: "Plain Text Converter", url: "https://convertcase.net/plain-text-converter/" },
      { name: "Gothic Text Generator", url: "https://convertcase.net/gothic-font-generator/" },
      { name: "Italic Text Generator", url: "https://convertcase.net/italic-text-converter/" },
      { name: "Mirrored Text Generator", url: "https://convertcase.net/mirror-text-generator/" },
      { name: "Phonetic Spelling Generator", url: "https://convertcase.net/phonetic-spelling-generator/" },
      { name: "Backwards Text Generator", url: "https://convertcase.net/reverse-text-generator/" },
      { name: "Slash Text Converter", url: "https://convertcase.net/slash-text-generator/" },
      { name: "Small Text Converter", url: "https://convertcase.net/small-text-generator/" },
      { name: "Stacked Text Generator", url: "https://convertcase.net/stacked-text-generator/" },
      { name: "Strikethrough Text Generator", url: "https://convertcase.net/strikethrough-text-generator/" },
      { name: "Subscript Generator", url: "https://convertcase.net/subscript-generator/" },
      { name: "Superscript Generator", url: "https://convertcase.net/superscript-generator/" },
      { name: "Typewriter Font Generator", url: "https://convertcase.net/typewriter-text-generator" },
      { name: "Underline Text Generator", url: "https://convertcase.net/underline-text/" },
      { name: "Upside Down Text Generator", url: "https://convertcase.net/upside-down-text-generator/" },
      { name: "Wide Text Generator", url: "https://convertcase.net/vaporwave-wide-text-generator/" },
      { name: "Wingdings Text Converter", url: "https://convertcase.net/wingdings-converter/" },
      { name: "Text to Emoji Converter", url: "https://text2emoji.com/" },
    ],

    "Generators": [
      { name: "QR Code Generator", url: "https://www.qrcode-monkey.com/" },
      { name: "Planet Generator", url: "https://zarkonnen.itch.io/planet-generator" },
      { name: "Rune Generator", url: "https://watabou.itch.io/rune-generator" },
      { name: "Compass Rose Generator", url: "https://watabou.itch.io/compass-rose-generator" },
      { name: "SVG Shape Generator", url: "https://www.softr.io/tools/svg-shape-generator" },
      { name: "Favicon Generator", url: "https://realfavicongenerator.net/" },
      { name: "Cool Text Effects", url: "https://cooltext.com/" },
      { name: "Word Cloud Generator", url: "https://convertcase.net/sort-alphabetically/" },     
      { name: "Fake Name Generator", url: "https://www.fakenamegenerator.com/" },
      { name: "Username Generator", url: "https://www.spinxo.com/username-generator" },
      { name: "Secure Password Generator", url: "https://www.lastpass.com/password-generator" },
      { name: "Random Password Generator", url: "https://www.random.org/passwords/" },
      
    ],

    "Color Tools": [
      { name: "Color Palette Generator", url: "https://coolors.co/generate" },
      { name: "Image Color Picker", url: "https://imagecolorpicker.com//" },
      { name: "RGB to Hex", url: "https://www.rapidtables.com/convert/color/rgb-to-hex.html" },
      { name: "Color Blindness Simulator", url: "https://www.color-blindness.com/coblis-color-blindness-simulator/" },
      { name: "RGB to HSL Converter", url: "https://www.rapidtables.com/convert/color/rgb-to-hsl.html" },
      { name: "RGB to CMYK Converter", url: "https://www.rapidtables.com/convert/color/rgb-to-cmyk.html" },
      { name: "RGB to Pantone Converter", url: "https://www.easyrgb.com/en/convert.php#inputFORM" },
    ],

    "Social Media": [
      { name: "X & Twitter Font Generator", url: "https://convertcase.net/twitter-font-generator/" },
      { name: "Facebook Font Generator", url: "https://convertcase.net/facebook-font-generator/" },
      { name: "Instagram Font Generator", url: "https://convertcase.net/instagram-fonts/" },
      { name: "Discord Font Generator", url: "https://convertcase.net/discord-fonts-generator/" },
      { name: "Reddit Video Downloader", url: "https://rapidsave.com/" },
      { name: "YouTube Mp3 & Mp4 Downloader", url: "https://ytmp3.plus/mp4/" },
      { name: "TikTok Video Downloader", url: "https://ssstik.io/en-1" },
      { name: "Instagram Private Downloader", url: "https://indown.io/private-downloader" },
      { name: "Hashtag Generator", url: "https://inflact.com/tools/instagram-hashtag-generator/#/" },
    ],

    "Translators": [
      { name: "Binary Translator", url: "https://www.binarytranslator.com/" },
      { name: "Morse Code Translator", url: "https://morsecode.world/international/translator.html" },
      { name: "Roman Numeral Date Converter", url: "https://convertcase.net/roman-numeral-date-converter/" },
      { name: "NATO Phonetic Alphabet Translator", url: "https://convertcase.net/nato-alphabet-translator/" },
      { name: "Pig Latin Translator", url: "https://convertcase.net/pig-latin-translator/" },
    ],

    "Finance & Math": [
      { name: "Compound Interest Calculator", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" },
      { name: "Amortization Calculator", url: "https://www.calculator.net/amortization-calculator.html" },
      { name: "Roth IRA Calculator", url: "https://www.bankrate.com/retirement/roth-ira-plan-calculator/" },
      { name: "Annuity Calculator", url: "https://www.omnicalculator.com/finance/annuity" },
      { name: "Effective Interest Rate Calculator", url: "https://www.calculatorsoup.com/calculators/financial/effective-interest-rate-calculator.php" },
      { name: "Future Value Calculator", url: "https://www.calculator.net/future-value-calculator.html" },
      { name: "Present Value of Annuity Calculator", url: "https://www.financialmentor.com/calculator/present-value-of-annuity-calculator" },
      { name: "Sinking Fund Calculator", url: "https://www.omnicalculator.com/finance/sinking-fund" },
      { name: "Stock Screener", url: "https://finviz.com/" },
    ],

    "Development": [
      { name: "CSS Gradient Generator", url: "https://cssgradient.io/" },
      { name: "HTML Color Codes", url: "https://htmlcolorcodes.com/" },
      { name: "HTML Color Names", url: "https://www.w3schools.com/colors/colors_names.asp" },
      { name: "What is a Website Built With Finder", url: "https://builtwith.com/" },
      { name: "Is My Internet Working?", url: "https://ismyinternetworking.com/" },
      { name: "Internet Speed Test", url: "https://fast.com/" },
    ],

    "Music & Audio": [
      { name: "Radio Garden", url: "https://radio.garden/" },
      { name: "Song Finder", url: "https://www.aha-music.com/" },
      { name: "Text to Mp3", url: "https://ttsmp3.com/" },
    ],

    "3D Printing": [
      { name: "Gridfinity Generator", url: "https://gridfinity.perplexinglabs.com/" },
      { name: "Filament Properties Table", url: "https://www.simplify3d.com/resources/materials-guide/properties-table/" },
      { name: "3D Writer", url: "https://3dwriter.io/" },
    ],

    "Geography": [
      { name: "Distance Between", url: "https://www.distancefromto.net/" },
      { name: "True Size Of...", url: "https://thetruesize.com/#?borders=1~!MTcxMDg4NzQ.MTg2ODk5NA*MzYwMDAwMDA(MA~!CONTIGUOUS_US*MTAwMjQwNzU.MjUwMjM1MTc(MTc1)Mg~!IN*NTI2NDA1MQ.Nzg2MzQyMQ)MQ~!CN*OTkyMTY5Nw.NzMxNDcwNQ(MjI1)MA" },
      { name: "Elevation Finder", url: "https://whatismyelevation.com/" },
      { name: "Flag Waver", url: "https://krikienoid.github.io/flagwaver/" },
    ],


    "Utilities & Misc": [
      { name: "10 Minute Mail", url: "https://10minutemail.com/" }, 
      { name: "Speed Reader", url: "https://www.spreeder.com/app.php" },                    
      { name: "Number Sorter", url: "https://convertcase.net/number-sorter/" },     
      { name: "Image to Multi-Page Printable PDF Converter", url: "https://rasterbator.net/" }, 
      { name: "Image in Minecraft Tool", url: "https://www.minecraft-dot.pictures/" },      
    ]
  };

  const otherContainer = document.getElementById("other-tools-container");
  const searchInput = document.getElementById("tool-search");

  let flatExternalList = [];

  function renderExternalTools(filter = "") {
    if (!otherContainer) return;

    otherContainer.innerHTML = "";

    Object.entries(externalToolCategories).forEach(([category, tools]) => {
      const matchingTools = tools.filter(tool =>
        tool.name.toLowerCase().includes(filter)
      );

      if (matchingTools.length === 0) return;

      const heading = document.createElement("h3");
      heading.style.marginTop = "40px";
      heading.textContent = category;
      otherContainer.appendChild(heading);

      matchingTools.forEach(tool => {
        const box = document.createElement("div");
        box.className = "tool-box";
        box.innerHTML = `
          <h4>${tool.name}</h4>
          <a href="${tool.url}" class="btn" target="_blank" rel="noopener noreferrer">
            Open Website
          </a>
        `;
        otherContainer.appendChild(box);
      });
    });
  }

  // Initial render
  renderExternalTools();

  // Search handling
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const value = e.target.value.toLowerCase().trim();
      renderExternalTools(value);
    });
  }

});
