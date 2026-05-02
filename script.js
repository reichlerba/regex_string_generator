// Written by Benjamin Reichler
// Interactive JS logic for regex string generator

const { Recoverable } = require("node:repl");

class Node {
    constructor() {
        this.transitions = []; // Transition array
    }
}
class Transition {
    constructor(l, n) {
        this.label = l; // Char ; == '_' is treated as epsilon
        this.next = n; // Node
    }
}
class NFA {
    constructor(s, a) {
        this.start = s; // Node
        this.accept = a; // Node
    }
}


const lengthInput = document.getElementById("lengthInput");
const lengthButton = document.getElementById("lengthButton");

const regexInput = document.getElementById("regexInput");
const regexOutput = document.getElementById("output");



let maxLengthToDisplay = 6;
lengthInput.placeholder = maxLengthToDisplay;


// update regexOutput on every regexInput keypress/paste/delete
regexInput.addEventListener("input", () => {
    const regexStr = regexInput.value;
    // parse regexStr
    let nfa = parseRegex(regexStr);

    // build generatedStrings 
    const generatedStrings = updateGeneratedStrings(nfa);

    // update regexOutput using generatedStrings
    render(generatedStrings);
});



// turns a string into an NFA using the server
function parseRegex(regexStr) {
    // calls fetch("/tokenize")
    const res = await fetch(`/tokenize?input=${regexStr}`);
    const tokens = await res.json();
    // now tokens is an array of objects

    let nextToken = 0;
    function peek(howFar) {
        const tokIndex = nextToken + howFar - 1;
        if(tokIndex < tokens.length) {
            return tokens[tokIndex];
        } else {
            return tokens[tokens.length - 1]; // ends with EOF token
        }
    }
    function getToken() {
        nextToken++;
        const tokIndex = nextToken - 1;
        if(tokIndex < tokens.length) {
            return tokens[tokIndex];
        } else {
            return tokens[tokens.length - 1]; // ends with EOF token
        }
    }
    function expect(expectedType) {
        const followToken = getToken();
        if(followToken.type === expectedType) {
            return followToken;
        } else {
            // syntax error
            return recover(expectedType, followToken);
        }
    }
    function recover(expectedType, foundType) {
        // add more checks later for closing parentheses, etc.
        return { type: "NONE", recovered: true };
    }

    // CFG grammar for valid RegEx program input:
    // expr -> term | term OR expr ;
    // term -> factor | factor term ;
    // factor -> atom | atom STAR ;
    // atom -> LPAREN expr RPAREN | ID ;
    
    // parsing functions are only relevant to parseRegex so they will live here
    function parse_expr() {
        let parsedTerm = parse_term();
        const followToken = peek(1);
        if(followToken.type === "OR") {
            expect("OR");
            const parsedExpr = parse_expr();
            parsedTerm = unionNFA(parsedTerm, parsedExpr);
        }
        return parsedTerm;
    }
    function parse_term() {

    }
    function parse_factor() {

    }
    function parse_atom() {

    }
    

    return parse_expr();
}

// build an NFA with one terminal
function makeTerminalNFA(c) { // Char
    const start = new Node();
    const accept = new Node();
    const t = new Transition(c, accept);
    start.transitions.push(t);
    return new NFA(start, accept);
}
// concatonate two NFAs
function concatNFA(first, second) { // NFA, NFA
    first.accept.transitions.push(new Transition('_', second.start));
    return new NFA(first.start, second.accept);
}
// OR two NFAs
function unionNFA(first, second) { // NFA, NFA
    const newStart = new Node();
    newStart.transitions.push(new Transition('_', first.start));
    newStart.transitions.push(new Transition('_', second.start));

    const newAccept = new Node();
    first.accept.transitions.push(new Transition('_', newAccept));
    second.accept.transitions.push(new Transition('_', newAccept));

    return new NFA(newStart, newAccept);
}
// Kleene star an NFA
function starNFA(nfa) { // NFA 
    const newStart = new Node();
    const newAccept = new Node();
    newStart.transitions.push(new Transition('_', nfa.start));
    newStart.transitions.push(new Transition('_', newAccept));

    nfa.accept.transitions.push(new Transition('_', nfa.start));
    nfa.accept.transitions.push(new Transition('_', newAccept));

    return new NFA(newStart, newAccept);
}



// builds and returns an array of strings with length up to maxLengthToDisplay generated using input nfa
function updateGeneratedStrings(nfa) {

}

// output strings from generatedStrings
function render(generatedStrings) {
    regexOutput.textContent = '';
    generatedStrings.forEach((nextStr) => {
        const p = document.createElement("p");
        p.textContent = nextStr;
        regexOutput.appendChild(p);
    });
}





// update maxLengthToDisplay only on button click
lengthButton.addEventListener("click", () => {
    if(lengthInput.value.trim().length === 0 || lengthInput.value < 0) {
        lengthInput.value = '';
        return;
    }
    maxLengthToDisplay = lengthInput.value;
    lengthInput.placeholder = maxLengthToDisplay
    lengthInput.value = '';
});
