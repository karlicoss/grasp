import '../img/icon-128.png'
import '../img/icon-34.png'

// TODO wtf?? what does that import mean??

function makeCaptureRequest() {
    var request = new XMLHttpRequest();
    console.log('adadad');

    // TODO configure port
    request.open('POST', 'http://localhost:8000/capture', true);


    // TODO request header??

    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            // Success!
            var data = JSON.parse(this.response);
            console.log(`SUCCESS ${data}`);
        } else {
            // We reached our target server, but it returned an error
        }
    };

    request.onerror = function() {
        console.log("ERROR!!!");
        // There was a connection error of some sort
    };

    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // xmlhttp.send(JSON.stringify({ "email": "hello@user.com", "response": { "name": "Tester" } }));
    request.send(JSON.stringify({'name': 'alala', 'age': 10}));
}
makeCaptureRequest();

