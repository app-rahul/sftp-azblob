const Client = require('ssh2').Client;
const fs = require('fs');
const conn = new Client();    
const sshOpt = {
    host: 'test.rebex.net',
    username: 'demo',
    password: 'password'
};    
const remoteFile = '/pub/example/readme.txt';
const localdir = 'temp';
const localZipFileName = 'sample.zip';
const localFile = localdir + '/' + localZipFileName;
try{
    if (!fs.existsSync(localdir)){
        fs.mkdirSync(localdir);
    }
    else if(fs.existsSync(localFile)){
        fs.rmSync(localFile);
    }
    
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) throw err;
            console.log('Downloading ' + remoteFile);
            sftp.fastGet(remoteFile, localFile, (err) => {
              if (err) throw err;
              console.log('Downloaded to ' + localFile);
              conn.end();
              
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
