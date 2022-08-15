//declared all our imports
const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
const { createWorker, createScheduler } = require('tesseract.js');

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
    console.log("Pitcure selected");
    res.render('index');
});

app.post("/upload", (req,res) => {
    console.log("Ready to upload picture");
    upload(req,res, err => {
            fs.readFile(`./uploads/${req.file.originalname}`,(err, data) => {
                (async () => {
                    const scheduler = createScheduler();
                    const worker1 = createWorker();
                    const worker2 = createWorker();
                    const rectangles = [
                        {
                            top: 470, 
                            left: 225, 
                            width: 90, 
                            height: 100 
                        },
                        {
                            top: 765, 
                            left: 80, 
                            width: 200, 
                            height: 265 
                        },
                      ];
                      await worker1.load();
                      await worker2.load();
                      await worker1.loadLanguage('eng');
                      await worker2.loadLanguage('eng');
                      await worker1.initialize('eng');
                      await worker2.initialize('eng');
                      await worker1.setParameters({
                        tessedit_char_whitelist: '0123456789qwertyuiopasdfghjklzxcvbnm.%',
                      });
                      await worker2.setParameters({
                        tessedit_char_whitelist: '0123456789qwertyuiopasdfghjklzxcvbnm.%',
                      });
                      scheduler.addWorker(worker1);
                      scheduler.addWorker(worker2);
                      const results = await Promise.all(rectangles.map((rectangle) => (
                        scheduler.addJob('recognize', `./uploads/${req.file.originalname}`, { rectangle })
                      )));
                      console.log(results.map(r => r.data.text));
                      await scheduler.terminate();
                    console.log('Tesseract terminated');
                  })();
        });
    });
});


//start up our server
const PORT = 5000 || process.env.PORT;
app.listen(PORT, () => console.log(`Hey I'm running on port ${PORT}`));
