var unirest = require('unirest');
var express = require('express');
var events = require('events');
var app = express();
app.use(express.static('public'));

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

var getRelatedFromApi = function(id) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + id + '/related-artists')
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

var getTopTracks = function(relID) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/artists/' + relID + '/top-tracks?country=us')
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

//globals for setting related artist id and artist
var srch_id;
var artist;


var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {

        artist = item.artists.items[0];
        srch_id = item.artists.items[0].id;

        var relatedArtist = getRelatedFromApi(srch_id);

        relatedArtist.on('end', function(item) {

            artist.related = item.artists;

            //set a counter and array length to know when to stop and output the json 'artist' object
            var count = 0;
            var length = artist.related.length;

            //iterate through each item in the array, making an API call for each related artist, getting the top tracks
            artist.related.forEach(function(currentArtist) {
                var topTracks = getTopTracks(currentArtist.id);

                //third .on.end handler
                topTracks.on('end', function(item) {
                    //setting the current artist tracks to the related artist tracks, displays in the html
                    currentArtist.tracks = item.tracks;

                    //counter to check if the length has equalled the total array length, if so, then break and output the json object
                    count++;
                    if (count === length) {
                        res.json(artist);
                    }
                });

                //error handling
                topTracks.on('error', function(code) {
                    res.sendStatus(code);
                });
            });
        });

        //error handling
        relatedArtist.on('error', function(code) {
            res.sendStatus(code);
        });

    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });

});

app.listen(process.env.PORT || 8080);