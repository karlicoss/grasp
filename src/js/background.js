/* @flow */
// TODO do I really need to annotate all files with @flow??

// TODO wtf?? what does that import mean??
// import '../img/icon-128.png'
// import '../img/icon-34.png'

const capture_endpoint = 'capture';
// TODO configure port
const port = 8000;


function capture_url (): string {
    return `http://localhost:${port}/${capture_endpoint}`;
}

function makeCaptureRequest(
    url: string,
    selection: ?string=null,
    comment: ?string=null, // TODO anything alse??
) {
    const data = JSON.stringify({
        'url': url,
        'selection': selection,
        'comment': comment,
    });


    var request = new XMLHttpRequest();
    console.log(`capturing ${data}`);

    request.open('POST', capture_url(), true);
    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            // Success!
            var response = JSON.parse(this.response);
            console.log(`SUCCESS ${response}`);
        } else {
            // We reached our target server, but it returned an error
        }
    };

    request.onerror = function() {
        console.log("ERROR!!!");
        // There was a connection error of some sort
    };

    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(data);
}
makeCaptureRequest('hello');
