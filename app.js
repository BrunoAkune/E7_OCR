//declared all our imports
const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
const { createWorker } = require('tesseract.js');
const worker = createWorker();
//define bouding boxes
const rectangles = [
    {
        //character name
        top: 155, 
        left: 20, 
        width: 400, 
        height: 65
    },
    {
        //setname1
        top: 774, 
        left: 83, 
        width: 165, 
        height: 24
    },
    {
        //setname2
        top: 804, 
        left: 83, 
        width: 165, 
        height: 24 
    },
    {
        //setname3
        top: 832, 
        left: 80, 
        width: 200, 
        height: 40 
    },
    {
    //stats
    top: 470, 
    left: 225, 
    width: 90, 
    height: 100 
    }
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

app.post("/upload", (req,res) => {
    upload(req,res, err => {
            fs.readFile(`./uploads/${req.file.originalname}`,(err, data) => {
                console.log("Picture uploaded"); 
                (async ()=> {
                    await worker.load();
                    await worker.loadLanguage('eng');
                    await worker.initialize('eng');
                    await worker.setParameters({
                         tessedit_char_whitelist: 'qwertyuiopasdfghjklzxcvbnm'+ ' ' + 'QWERTYUIOPASDFGHJKLZXCVBNM' + '123456789.%',
                         tessedit_char_blacklist: "é\/"
                    });
                    const values = [];
                    console.log("Reading rectangles")
                    for (let i = 0; i < rectangles.length; i++) {
                        const { data: { text } } = await worker.recognize(`./uploads/${req.file.originalname}`, { rectangle: rectangles[i] });
                        console.log(rectangles[i])
                        values.push(text);
                        console.log(values);
                    }
                  })();
                });
            });
    });

//start up our server
const PORT = 5000 || process.env.PORT;
app.listen(PORT, () => console.log(`Hey I'm running on port ${PORT}`));
