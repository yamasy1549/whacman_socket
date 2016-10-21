var fs         = require('fs');
var app        = require('express')();
var http       = require('http').Server(app);
var io         = require('socket.io')(http);
var bodyParser = require('body-parser');
var axios      = require('axios');

// DBへの接続
const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost/jsonAPI';
var mongoose      = require('mongoose');
var autoIncrement = require("mongoose-auto-increment");
var db = mongoose.connect(MONGO_URL);
autoIncrement.initialize(db);
var PlayerSchema  = require('./models/player');
PlayerSchema.pre("save", function(next){
    this.date = new Date();
    next();
});
PlayerSchema.plugin(autoIncrement.plugin, 'Test');
var Player = mongoose.model('Player', PlayerSchema);

// POSTでdataを受け取るための記述
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/api/players', function(req, res){
    Player.find(function(err, players) {
        if (err)
            res.send(err);
        res.json(players);
    });
});

app.post('/api/players', function(req, res) {
    var player = new Player();

    player.name = req.body.name;
    player.score = 0;

    player.save(function(err) {
        if (err)
            res.send(err);
        res.json({ message: 'Player created!' });
    });
})

app.get('/api/players/:player_id', function(req, res){
    Player.findById(req.params.player_id, function(err, player) {
        if (err)
            res.send(err);
        res.json(player);
    });
});

app.put('/api/players/:player_id', function(req, res){
    Player.findById(req.params.player_id, function(err, player) {
        if (err)
            res.send(err);
        player.name = req.body.name || player.name;
        if(req.body.hit) {
          player.score = player.score + 100;
        }

        player.save(function(err) {
            if (err)
                res.send(err);
            res.json({ message: 'Player updated!' });
        });
        io.emit('reflect scores', player);
    });
});

app.delete('/api/players/:player_id', function(req, res){
    Player.remove({
        _id: req.params.player_id
    }, function(err, user) {
        if (err)
            res.send(err);
        res.json({ message: 'Successfully deleted' });
    });
});

app.get('/', function(req, res) {
  res.sendfile('start.html');
});

app.get('/players/:player_id', function(req, res) {
  res.sendfile('index.html');
});

io.on('connection', function(socket) {
  socket.on('reflect scores', function(msg) {
    io.emit('reflect scores', msg);
  });

  socket.on('start', function(msg) {
    // TODO: ここでRasPiに向けてAPIたたく
    axios.post('https://whacman-node.herokuapp.com/api/timer', {
        start: 1
      })
      .then(function(res) {
        console.log('start success');
      })
      .catch(function(err) {
        console.log(err);
      })
    console.log('start', msg);
  });

  socket.on('stop', function(msg) {
    // TODO: ここでRasPiに向けてAPIたたく
    axios.post('https://whacman-node.herokuapp.com/api/timer', {
        stop: 1
      })
      .then(function(res) {
        console.log('stop success');
      })
      .catch(function(err) {
        console.log(err);
      })
    console.log('stop', msg);
  });
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on *:', port);
});
