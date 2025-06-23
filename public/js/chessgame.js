const socket = io(); 
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = '';
    board.forEach((row,rowindex)=>{
        row.forEach((square,squareindex)=>{
         const squareElement =   document.createElement("div");
         squareElement.classList.add("square",
            (rowindex + squareindex) % 2 === 0 ? 'light' : 'dark'
         );
         squareElement.dataset.row = rowindex;
         squareElement.dataset.col = squareindex;

         if(square){
            const pieceElement = document.createElement("div");
            pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black", square.type);
            pieceElement.innerText= getPieceUnicode(square);
            pieceElement.draggable= playerRole === square.color;
            pieceElement.addEventListener("dragstart", (e) => {
                if(pieceElement.draggable) {
                    draggedPiece = pieceElement;
                    sourceSquare = {row: rowindex, col: squareindex};
                    e.dataTransfer.setData("text/plain", "");
                }
         });

         pieceElement.addEventListener("dragend", () => {
            draggedPiece = null;
            sourceSquare = null;
         });

            squareElement.appendChild(pieceElement);
        
         

        }

        squareElement.addEventListener("dragover", (e) => {
            e.preventDefault();
        });

        squareElement.addEventListener("drop", (e) => {
            e.preventDefault();
            if(draggedPiece && sourceSquare) {
                const targetSquare = {
                    row: parseInt(squareElement.dataset.row),
                    col: parseInt(squareElement.dataset.col),
                };
                handleMove(sourceSquare, targetSquare);
            }
        });

         boardElement.appendChild(squareElement);

    });
});

if(playerRole == "b"){
    boardElement.classList.add("flipped");
}else{
    boardElement.classList.remove("flipped");
}
};



const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // always promote to a queen for simplicity
    };

    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const pieceUnicode = {
        p: { w: '♙', b: '♟' },
        r: { w: '♖', b: '♜' },
        n: { w: '♘', b: '♞' },
        b: { w: '♗', b: '♝' },
        q: { w: '♕', b: '♛' },
        k: { w: '♔', b: '♚' },
    };
    return pieceUnicode[piece.type]?.[piece.color] || '';
};

socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();

});

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    renderBoard();
});

document.addEventListener("DOMContentLoaded", renderBoard);

const roomId = "someRoomId"; // Replace with the actual room ID
socket.emit("joinRoom", roomId);