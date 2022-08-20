//declared all our imports for the OCR API
const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
const { createWorker, PSM  } = require('tesseract.js');
const worker = createWorker();

//declared API Google Sheets
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./google-sheets-key.json'); // Credentials for the Google Sheets
const doc = new GoogleSpreadsheet('1AL6dgmFY2UVe5av0oyPyA_z4iPxxk79m0HtM_hZqWbE'); //ID of the spreadsheet

//define bouding boxes
const rectangles = [
    {
    //1 - character name
    top: 155,left: 40,width: 360,height: 62},
    {
    //2 - setname1
    top: 774,left: 83,width: 165,height: 26},
    {
    //3 - setname2
    top: 804,left: 83,width: 165,height: 26},
    {
    //4 - setname3
    top: 832,left: 80,width: 200,height: 26},
    {
    //5 - attack
    top: 475,left: 230,width: 90,height: 24},
    {
    //6 - def
    top: 500,left: 230,width: 90,height: 24},
    {
    //7 - HP
    top: 530,left: 230,width: 90,height: 24},
    {
    //8 - Speed
    top: 560,left: 230,width: 90,height: 24},
    {
    //9 - Crit C
    top: 590,left: 230,width: 90,height: 24},
    {
    //10 - Crit Dmg
    top: 620,left: 230,width: 90,height: 24},
    {
    //11 - Eff
    top: 650,left: 230,width: 90,height: 24},
    {
    //12 - Eff Res
    top: 680,left: 230,width: 90,height: 24},
    {
    //13 - Dual Att
    top: 710,left: 230,width: 90,height: 24},
];

// Call Tesseract as early as possible

//declared our storage
const storage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null, "./uploads");
    },
    filename: (req,file,cb) =>{
    cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage }).single("avatar");

app.set("view engine", "ejs");
//Declared our routes
app.get('/', (req, res) => {
    res.render('index');
});

//Sending OCR data to Google Sheets
const database = async (values) => {
    //all the variabales used
    const stats = Array.from(values); //reciclying the array used in the OCR to add to the columns

    //Opening and loading the file
    console.log("Opened the file:" + doc.spreadsheetId);
    console.log(values + "received");
    await doc.useServiceAccountAuth(creds); //Use the credential in the same folder
    await doc.loadInfo();
    const worksheet = doc.sheetsByIndex[0]; // Here, 1st tab on Google Spreadsheet is used.

    await worksheet.setHeaderRow(["Character"]);
    console.log("Header set");

    var rows = await worksheet.getRows()

    var charName = stats[0]

    var alreadyAdded = false

    for (var i = 0; i < rows.length; i++) {
        if (charName === rows[i].Character) {
            alreadyAdded = true
            break
        }
    }

    var characterSheet = null

    if (!alreadyAdded) {
        console.log("Adding " + charName + " to the Character list");
        try {
            worksheet.addRow([charName]);

            // Adding a new worksheet
            characterSheet = await doc.addSheet({ title: charName });

            console.log("Adding new sheet for " + charName);
            await characterSheet.setHeaderRow(["Name", "Set 1", "Set 2", "Set 3", "Attack",
                                               "Defense", "Health", "Speed", "Critical Hit Chance",
                                               "Critical Hit Damage", "Effectiveness",
                                               "Effect Resistance", "Dual Attack"]);
        } catch (err) {
            console.log("Error creating new sheet: " + err.message);
            console.log("Sheet probably already existed, trying to use an existing one");
            characterSheet = await doc.sheetsByTitle[charName]
        }
    } else {
        console.log("Character already added (" + charName + ")");

        console.log("Getting current sheet for " + charName);
        characterSheet = await doc.sheetsByTitle[charName]
    }

    console.log("Adding new data for " + charName);
    characterSheet.addRow(stats);
    console.log("Finish");
};

//Scanning the image and getting the name, stats and sets of the character uploaded
app.post("/upload", (req,res) => {
    upload(req,res, err => {
            fs.readFile(`./uploads/${req.file.originalname}`,(err, data) => {
                console.log("Picture uploaded");
                (async ()=> {
                    await worker.load();
                    const values = [];
                    console.log("Reading rectangles")
                    for (let i = 0; i < rectangles.length; i++) {
                        //Only read letters until it finishes reading the name + sets
                        if (i<4){
                            await worker.load();
                            await worker.loadLanguage('eng');
                            await worker.initialize('eng');
                            await worker.setParameters({
                            tessedit_char_whitelist: 'qwertyuiopasdfghjklzxcvbnm'+ ' ' + 'QWERTYUIOPASDFGHJKLZXCVBNM',
                            tessedit_char_blacklist: "é\/!" ,
                            //tessedit_pageseg_mode:  PSM.RAW_LINE
                    });
                        } else {
                            //Only read number for the stats.
                            await worker.load();
                            await worker.loadLanguage('eng');
                            await worker.initialize('eng');
                            await worker.setParameters({
                            tessedit_char_whitelist: '0123456789.%',
                            tessedit_char_blacklist: "é\/?!" ,
                            //tessedit_pageseg_mode: PSM.SINGLE_LINE
                        });
                        }
                         const { data: { text } } = await worker.recognize(`./uploads/${req.file.originalname}`, { rectangle: rectangles[i] });
                         console.log(rectangles[i])
                         values.push(text.replace(/(\r\n|\n|\r)/gm, ""));
                         console.log(values[i]);
                     }
                    console.log(values);
                    res.send(values); //send the results to the screem
                    await worker.terminate(); 
                    database(values); //send the results to Google Sheets
                   })();
                });

            });

    });

//start up our server
const PORT = 5000 || process.env.PORT;
app.listen(PORT, () => console.log(`Hey I'm running on port ${PORT}`));
