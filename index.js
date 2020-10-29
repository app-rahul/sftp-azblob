const Client = require('ssh2').Client;
const fs = require('fs');
const unzipper = require('unzipper');
const config = require('./config');
const conn = new Client();    
const sshOpt = config.sshOpt;
const remoteFile = config.remoteZipFilePath;
const localdir = config.localdir;
const localZipFileName = config.localZipFileName;
const localFile = localdir + '/' + localZipFileName;
const localZipPassword = config.zipFilePassword;

try{
    if (!fs.existsSync(localdir)){
        fs.mkdirSync(localdir);
    }
    else if(fs.existsSync(localFile)){
        fs.unlinkSync(localFile);
    }
    
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) throw err;
            console.log('Downloading ' + remoteFile);
            sftp.fastGet(remoteFile, localFile, (err) => {
              if (err) throw err;
              console.log('Downloaded to ' + localFile);
              conn.end();
              (async () => {
                try {
                    //var wstream = fs.createWriteStream('out1.txt');
                    const directory = await unzipper.Open.file(localFile);
                    const extractedstram = await directory.files[0].st(localZipPassword);
                    console.log(extractedstram.toString());
                }
                catch(ex) {
                    throw ex;
                }
              })();
            });
        });
    });
    conn.on('error', (err) => {
        console.error('SSH connection stream problem');
        throw err;
    });
    conn.connect(sshOpt);
}
catch(ex){
    console.log(ex);
}
