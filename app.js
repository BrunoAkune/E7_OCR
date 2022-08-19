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
    const row = Array.from(values); //reciclying the array used in the OCR to add to the columns
    var dictionary = [];

    //Opening and loading the file
    console.log("Opened the file:" + doc.spreadsheetId);
    console.log(values + "received");
    await doc.useServiceAccountAuth(creds); //Use the credential in the same folder
    await doc.loadInfo();
    const worksheet = doc.sheetsByIndex[0]; // Here, 1st tab on Google Spreadsheet is used.

    await worksheet.setHeaderRow(["These are all the characters in this sheet:"]);
    console.log("Header set");
    dictionary = [row[0]]; //Creating a new array using only the names uploaded.
    await worksheet.addRow(dictionary);
    const dictionaryLength = dictionary.push();
    console.log(dictionaryLength);
    // adding sheets
    const newSheet = await doc.addSheet({ title: values[0] });

    //Adding the Stats
    await newSheet.setHeaderRow(["Name", "Set 1", "Set 2", "Set 3", "Attack",
    "Defense", "Health", "Speed", "Critical Hit Chance", "Critical Hit Damage", "Effectiveness",
    "Effect Resistance", "Dual Attack"]); // This is the header row.
    console.log("Headers set");
    console.log("Adding Row");
    await newSheet.addRow(row); // This is the row content
    console.log("Row added");
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
                         values.push(text);
                         console.log(values[i]);
                     }
                    console.log(values);
                    res.send(values); //send the results to the screem
                    database(values); //send the results to Google Sheets
                   })();
                });

            });

    });

//start up our server
const PORT = 5000 || process.env.PORT;
app.listen(PORT, () => console.log(`Hey I'm running on port ${PORT}`));
