var os = require('os');
var _ = require('lodash');
var exec = require('child_process').exec;
var fs=require('fs');


/*
 *Just for being fair with my packages and to do list all network IFaces i prefer doing the later method and execlude the os.networkInterfaces() package
 thus i shall be reading the directory listing instead
 *
 *in this case we can omit the whole os module
 */

/// DEFINITION ///

//TODO: TESTS
function getStats(next) {
    fs.readdir('/sys/class/net',function(err,IFaces){
        if(err) {
            process.exit(1);
        }else{
            // IFaces holds an array list of all network Interfaces in the system
            var networks = _.map(IFaces,function(IFace){
                var Tx_Bytes=fs.readFileSync('/sys/class/net/'+IFace+'/statistics/tx_bytes');
                var Rx_Bytes=fs.readFileSync('/sys/class/net/'+IFace+'/statistics/rx_bytes');
                return {
                    name: IFace,
                    tx: parseInt(Tx_Bytes),
                    rx: parseInt(Rx_Bytes)
                };
            });
            getDriveSpace(function(error,total,free,status){
                var obj = {
                    hostname: os.hostname(),
                    cpus : os.cpus(),
                    freemem : os.freemem(),
                    totalmem : os.totalmem(),
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


function getDriveSpace(callback){
    exec("df -k /", function(error, stdout, stderr)
    {
        if (error)
        {
            if (stderr.indexOf("No such file or directory") != -1)
            {
                status = 'NOTFOUND';
            }
            else
            {
                status = 'STDERR';
            }

            callback(error, total, free, status);
        }
        else
        {
            var lines = stdout.trim().split("\n");

            var str_disk_info = lines[lines.length - 1].replace( /[\s\n\r]+/g,' ');
            var disk_info = str_disk_info.split(' ');            
            total = disk_info[1] * 1024;
            free = disk_info[3] * 1024;
            status = 'READY';
            callback(null, total, free, status);        }
    });
}


setInterval(()=>{
   getStats((data)=>{
      var d = new Date();
      var logPath = "./logs/system-" + d.getFullYear() + "-" + d.getMonth() + "-" + d.getDay()
      try{
         var log = fs.readFileSync(logPath,'utf-8')
         var logs = JSON.parse(log);
      }catch(e){
         var logs=[]
      }

      logs.push(data)
      fs.writeFileSync(logPath, JSON.stringify(logs), 'utf-8')

      
   })
},1000)