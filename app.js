/**
 * @Copyright David Byrd (david@byrdhou.se)
 * @Date April 1, 2012 
 */
/**
 * Module dependencies.
 */
var express = require('express')//Kickass SINATRA-LIKE Micro Framework for Node
  , mongoose = require('mongoose')//mongodb ORM
  , sanitizer = require('sanitizer')//google CAJA port to node
  , RedisStore = require('connect-redis')(express);//REDIS
var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');//JADE templating language: uses widespace for DOM tree depth
  app.set('view options', { layout: false });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.session({ secret: "roomates suck", store: new RedisStore }));//Session Data Handled
  app.use(app.router);
  app.enable('jsonp callback')
  mongoose.connect('mondodb://localhost:27017/rancor');
});

app.configure('development', function(){ app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); });

app.configure('production', function(){ app.use(express.errorHandler());});

//Model
var Schema = mongoose.Schema, ObjectId = Schema.ObjectId;

var Rant = new Schema({
    content	: String
  , likes	: { type: Number, default: 0, index: true }
  , location	: String
  , timestamp	: { type: Date, default: Date.now, index:true }
  , urlSlug	: ObjectId
});
mongoose.model('Rant', Rant);
var Rant = mongoose.model('Rant');

// Routes
app.get('/', function(req, res){ 
  Rant.find().sort("likes",-1).exec(function(err, found){ 
    console.log("all rants requested"); 
    res.json(found);
  });  
});
app.get('/:id', function(req, res){
  Rant.findById(req.params.id, function(err, found){
    if(err == null) {
      console.log("rant " + req.params.id + " requested. ");
      res.json(found);
    } else {
      console.log(err);
      res.send(err);
    }
  });
});
app.post('/add', function(req,res) {
  console.log(req.body);
  var someRant = new Rant({content:sanitizer.sanitize(req.body.content), location:sanitizer.sanitize(req.body.location)});
  someRant.save(function(err){if(err) {console.log("write error");} else {console.log("complaint stored");}});
  res.redirect("back");
});
app.post('/vote/:type', function(req,res) {//Voting System:This is the only real business logic
  console.log("request received");
  console.log(req.body.id);
  
  if(req.body.id === "-1")
  {
    if(req.params.type == 'like') res.send({votes:"∞ + 1"});
    else res.send({votes:"∞ - 1"});
  }
  else 
  {
      Rant.findOne({"_id":req.body.id}, function(err, found) {
        console.log(found);
        //check if session exists
        
        if(req.session.likes  === undefined)
        {
            if(req.params.type == 'like'){ found.likes++; req.session.likes = req.body.id;}
            else if(req.params.type == 'dislike'){ found.likes--; req.session.likes = req.body.id;}
            else console.log("Invalid Vote Request made with argument: "+req.params.type);
            //console.log("Session Cookie: "+req.session.likes);
            found.save(function(err){if(err) {console.log("write error: "+err);} else {console.log("vote stored");}});
        }
        else if(req.session.likes.indexOf(req.body.id) === -1)
        {
            if(req.params.type == 'like'){ found.likes++; console.log(req.body.id); req.session.likes = req.session.likes + req.body.id;}
            else if(req.params.type == 'dislike'){ found.likes--; req.session.likes = req.session.likes + req.body.id;}
            else console.log("Invalid Vote Request made with argument: "+req.params.type);
            console.log("Session Cookie: "+req.session.likes);        
            found.save(function(err){if(err) {console.log("write error: "+err);} else {console.log("complaint stored");}});
        }
        else console.log("Session Cookie: "+req.session.likes);
        res.send({votes:found.likes});
      
      });
      
  }
});
app.listen(8000);
console.log("Express server listening on port %d in %s mode", 8000, app.settings.env);
