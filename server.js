/*************************
Step 1: include external dependencies
*************************/

var unirest = require('unirest');
var express = require('express');
var events = require('events');
var app = express();
app.use(express.static('public'));



/*************************
Step 2: define functions and global variables
*************************/

//first API call to get the artist ID by name search
//endpoint = search; args => q: req.params.name, limit: 1, type: 'artist'
var getFromApi = function (endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        //after api call we get the response inside the "response" parameter
        .end(function (response) {
            //success scenario
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            //failure scenario
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

//second API call to get the list of related artists
var getRelatedFromApi = function (artistID) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + artistID + '/related-artists')
        //after api call we get the response inside the "response" parameter
        .end(function (response) {
            //success scenario
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            //failure scenario
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

//third API call to get the list of top tracks for each related artist
var getTopTracks = function (relatedArtistID) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + relatedArtistID + '/top-tracks?country=us')
        //after api call we get the response inside the "response" parameter
        .end(function (response) {
            //success scenario
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            //failure scenario
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

//globals for setting related artist id and artist
var srch_id;
var artist;


/*************************
Step 3: define functions and global variables
*************************/

//GET Route - search by name
app.use(express.static('public'));

app.get('/search/:name', function (req, res) {
    //first API call
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    //get the data from the first api call
    searchReq.on('end', function (item) {

        //get the artists and ID for use in next call
        artist = item.artists.items[0];
        srch_id = item.artists.items[0].id;

        //second API call
        var relatedArtist = getRelatedFromApi(srch_id);

        //get the data from the second api call
        relatedArtist.on('end', function (item) {

            //set the related artists to make the html work
            artist.related = item.artists;

            //set a counter and array length to know when to stop and output the json 'artist' object
            var count = 0;
            var length = artist.related.length;

            //iterate through each item in the array, making an API call for each related artist, getting the top tracks
            artist.related.forEach(function (currentArtist) {

                //third API call
                var topTracks = getTopTracks(currentArtist.id);

                //get the data from the third api call
                topTracks.on('end', function (item) {
                    //setting the current artist tracks to the related artist tracks, displays in the html
                    currentArtist.tracks = item.tracks;

                    //counter to check if the length has equalled the total array length, if so, then break and output the json object
                    count++;
                    if (count === length) {
                        res.json(artist);
                    }
                });

                //error handling
                topTracks.on('error', function (code) {
                    res.sendStatus(code);
                });
            });
        });

        //error handling
        relatedArtist.on('error', function (code) {
            res.sendStatus(code);
        });

    });

    //error handling
    searchReq.on('error', function (code) {
        res.sendStatus(code);
    });

});

/*************************
Step 4: server settings
*************************/

//express http listener
app.listen(process.env.PORT || 8080);