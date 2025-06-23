const express = require("express");
const socket = require("socket.io");
const {Chess} = require("chess.js");
const http = require("http");
const path =require("path");
const e = require("express");




const app = express();


const server = http.createServer(app); // socket says tgat create a separte http server and connect your express server with this http server
const io = socket(server);             // and this line says that socket will run on that http server

const chess = new Chess();
let players = {};
let currentPlayer = "w";     //first player will be white

app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(req,res)=>{
    res.render("index");
});

//for sending the chessboard state to the players

io.on("connection",(uniquesocket)=>{
    console.log("connected"); 

    if(!players.white){
        players.white=uniquesocket.id;
        uniquesocket.emit("playerRole","w");
    }else if(!players.black){
        players.black=uniquesocket.id;
        uniquesocket.emit("playerRole","b");
    }else{
        uniquesocket.emit("spectatorRole");
    }

    //for disconnecting players

    uniquesocket.on("disconnect",()=>{
        console.log("disconnected");
        if(uniquesocket.id === players.white){
            delete players.white;
        }else if(uniquesocket.id === players.black){
            delete players.black;
        }
    });

    uniquesocket.on("move",(move)=>{
    try{
       if(chess.turn()=="w" && uniquesocket.id !==players.white) return;
       if(chess.turn()=="b" && uniquesocket.id !==players.black) return;

         const result = chess.move(move);
         if(result){
            currentPlayer = chess.turn();
            io.emit("move",move); //send the move to all players
            io.emit("boardState",chess.fen()); //send the chessboard state to all players
         }
         else{
            uniquesocket.emit("invalidMove",move); //send the invalid move to the player who made the invalid move
         }

        }catch(error){
        console.log(error);
    }

    });
});



server.listen(3000,function(){
    console.log("server is listening on port 3000");
});