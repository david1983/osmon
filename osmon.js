var os = require('os');
var _ = require('lodash');
var exec = require('child_process').exec;
var fs = require('fs');
var firebase = require("firebase");
var Datastore = require('nedb');

try {
    fs.statSync('./logs')
} catch (e) {
    fs.mkdirSync("logs")
}


var config = {
    apiKey: "AIzaSyCTPCc-dc8PVyz2zF-G8xA1BhHLOpakX0o",
    authDomain: "metrics-62e24.firebaseapp.com",
    databaseURL: "https://metrics-62e24.firebaseio.com",
    projectId: "metrics-62e24",
    storageBucket: "",
    messagingSenderId: "1072892963262"
};
firebase.initializeApp(config);

/*
 *Just for being fair with my packages and to do list all network IFaces i prefer doing the later method and execlude the os.networkInterfaces() package
 thus i shall be reading the directory listing instead
 *
 *in this case we can omit the whole os module
 */

/// DEFINITION ///

//TODO: TESTS
function getStats(next) {
    fs.readdir('/sys/class/net', function (err, IFaces) {
        if (err) {
            process.exit(1);
        } else {
            // IFaces holds an array list of all network Interfaces in the system
            var networks = _.map(IFaces, function (IFace) {
                var Tx_Bytes = fs.readFileSync('/sys/class/net/' + IFace + '/statistics/tx_bytes');
                var Rx_Bytes = fs.readFileSync('/sys/class/net/' + IFace + '/statistics/rx_bytes');
                return {
                    name: IFace,
                    tx: parseInt(Tx_Bytes),
                    rx: parseInt(Rx_Bytes)
                };
            });
            getDriveSpace(function (error, total, free, status) {

                var dt = new Date();
                var utcDate = dt.toUTCString();
                var obj = {
                    date: utcDate,
                    timestamp: Math.floor(Date.now()),
                    hostname: os.hostname(),
                    cpus: os.cpus(),
                    freemem: os.freemem(),
                    totalmem: os.totalmem(),
                    uptime: os.uptime(),
                    loadavg: os.loadavg(),
                    diskfree: free,
                    disktotal: total,
                    diskstatus: status,
                    network: networks
                };
                next(obj)
            });
        }

    });

}

function getDriveSpace(callback) {
    exec("df -k /", function (error, stdout, stderr) {
        if (error) {
            if (stderr.indexOf("No such file or directory") != -1) {
                status = 'NOTFOUND';
            }
            else {
                status = 'STDERR';
            }

            callback(error, total, free, status);
        }
        else {
            var lines = stdout.trim().split("\n");

            var str_disk_info = lines[lines.length - 1].replace(/[\s\n\r]+/g, ' ');
            var disk_info = str_disk_info.split(' ');
            total = disk_info[1] * 1024;
            free = disk_info[3] * 1024;
            status = 'READY';
            callback(null, total, free, status);
        }
    });
}



let buffer = []
const bufferLimit = 1
const interval = 5000
setInterval(() => {
    let d = new Date();
    let confObj = { filename: 'logs/metrics-'  + d.getFullYear() + '-' + (parseInt(d.getMonth())+1) + '-' + d.getDate() + '.db', autoload: true }
    
    try{
        fs.statSync(confObj.filename)
    }catch(e){
        fs.writeFileSync(confObj.filename, '')
    }
    
    getStats((data) => {
        buffer.push(data)        
        if(buffer.length>=bufferLimit){
            console.log(confObj)
            let metrics = new Datastore(confObj);
            metrics.insert(buffer, (e,r)=>{
                buffer = []
            })
        }       
    })
}, interval)