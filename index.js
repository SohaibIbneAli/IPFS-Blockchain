const ipfsAPI = require('ipfs-http-client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
var express = require('express');

const app = express();

const MAX_SIZE = 52428800;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}.${file.mimetype.split('/')[1]}`);
  },
});

const upload = multer({ storage });

//Connceting to the ipfs network via infura gateway
const ipfs = ipfsAPI('ipfs.infura.io', '5001', { protocol: 'https' })



app.use(express.static('./public'));


app.post('/add-file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(422).json({
      error: 'File needs to be provided.',
    });
  }

  const mime = req.file.mimetype;
  if (mime.split('/')[0] !== 'image') {
    fs.unlink(req.file.path);

    return res.status(422).json({
      error: 'File needs to be an image.',
    });
  }

  const fileSize = req.file.size;
  if (fileSize > MAX_SIZE) {
    fs.unlink(req.file.path);

    return res.status(422).json({
      error: `Image needs to be smaller than ${MAX_SIZE} bytes.`,
    });
  }

  const data = fs.readFileSync(req.file.path);
  const dataBuffer = ipfs.types.Buffer.from(data);

  try {
    let results = await ipfs.add(dataBuffer);
    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(500).json('Error: ', JSON.stringify(error));    
  }
});


//Getting the uploaded file via hash code.
app.get('/get-file/:id', function (req, res) {

  //This hash is returned hash of addFile router.
  const validCID = req.params.id;

  ipfs.get(validCID, function (err, files) {
    files.forEach((file) => {
      res.send(file.content.toString('utf8'))
    })
  })
})

app.listen(3000, () => console.log('App listening on port 3000!'))
