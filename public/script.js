// Written by Benjamin Reichler
// Interactive JS logic for regex string generator

class NodeReg { // 'Node' is a reserved DOM keyword --> use NodeReg
    constructor() {
        this.transitions = []; // Transition array
    }
}
class Transition {
    constructor(l, n) {
        this.label = l; // Char or ID ; == '_' is treated as epsilon
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

let nfa_for_current_regex = null;

let maxLengthToDisplay = 6;
lengthInput.placeholder = maxLengthToDisplay;

async function reloadPage(regTextStr) {
    // parse regTextStr
    // calls fetch("/tokenize")
    const res = await fetch(`/tokenize?input=${regTextStr}`);
    const tokens = await res.json();
    // now tokens is an array of objects
    nfa_for_current_regex = parseRegex(regTextStr, tokens);

    // build generatedStrings 
    const generatedStrings = updateGeneratedStrings();

    // update regexOutput using generatedStrings
    render(generatedStrings);
}

reloadPage("(a|b)*c");

// update regexOutput on every regexInput keypress/paste/delete
regexInput.addEventListener("input", async () => {
    let regexStr = regexInput.value;
    if(regexStr.trim().length === 0) {
        regexStr = '_';
    }

    reloadPage(regexStr);
});



// turns a string into an NFA using the server
function parseRegex(regexStr, tokens) {
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
    // atom -> LPAREN expr RPAREN | ID | UNDRSC ;
    
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
        let parsedFactor = parse_factor();
        const followToken = peek(1);
        // FOLLOW(term) = { OR, EOF, RPAREN }
        // FIRST(term) = { LPAREN, ID, UNDRSC }
        if(followToken.type === "LPAREN" || followToken.type === "ID" || followToken.type === "UNDRSC") {
            // term --> factor term
            const termFactor = parse_term();
            // concatonate termFactor to end of parsedFactor
            parsedFactor = concatNFA(parsedFactor, termFactor);
        }
        return parsedFactor;
    }
    function parse_factor() {
        const parsedAtom = parse_atom();
        if(peek(1).type === "STAR") {
            expect("STAR");
            return starNFA(parsedAtom);
        }
        return parsedAtom;
    }
    function parse_atom() {
        const followToken = peek(1);
        if(followToken.type === "ID") {
            expect("ID");
            return makeTerminalNFA(followToken.lexeme);
        } else if(followToken.type === "UNDRSC") {
            expect("UNDRSC");
            return makeTerminalNFA('_');
        } else if(followToken.type === "LPAREN") {
            expect("LPAREN");
            const parsedExpr = parse_expr();
            expect("RPAREN");
            return parsedExpr;
        } else {
            // ex. when the very first char/token in the expr is invalid
            // try: just consume this invalid token and try again?
            const invalidToken = getToken();
            return parse_atom(); // or would parse_expr() be more appropriate?
        }
    }


    return parse_expr();
    // In appropriate input, EOF isn reached after parsing an expr
    // If it is not reached, we will choose to
    // ignore the rest of the unusued, invalid tokens
}

// build an NFA with one terminal
function makeTerminalNFA(c) { // Char or ID
    const start = new NodeReg();
    const accept = new NodeReg();
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
    const newStart = new NodeReg();
    newStart.transitions.push(new Transition('_', first.start));
    newStart.transitions.push(new Transition('_', second.start));

    const newAccept = new NodeReg();
    first.accept.transitions.push(new Transition('_', newAccept));
    second.accept.transitions.push(new Transition('_', newAccept));

    return new NFA(newStart, newAccept);
}
// Kleene star an NFA
function starNFA(nfa) { // NFA 
    const newStart = new NodeReg();
    const newAccept = new NodeReg();
    newStart.transitions.push(new Transition('_', nfa.start));
    newStart.transitions.push(new Transition('_', newAccept));

    nfa.accept.transitions.push(new Transition('_', nfa.start));
    nfa.accept.transitions.push(new Transition('_', newAccept));

    return new NFA(newStart, newAccept);
}



// builds and returns an array of strings with length up to maxLengthToDisplay
function updateGeneratedStrings() {
    // functions to traverse an nfa
    function epsilonClosure(states) {
        // take all epsilon ('_') transitions
        // return new states after taking 0+ epsilon transitions
        const stack = [...states]; // unpack states into new array
        const result = new Set(states); // avoid duplicates with Set
        while(stack.length > 0) { // use stack fo take epsilons trans multiple times
            const node = stack.pop();
            for(const t of node.transitions) {
                if(t.label === '_' && !result.has(t.next)) {
                    result.add(t.next);
                    stack.push(t.next);
                }
            }
        }
        return result;
    }
    function getSymbols(states) {
        // find labels on all transitions from each state in states
        const allIDs = new Set();
        for(const n of states) {
            for(const t of n.transitions) {
                if(t.label !== '_') { // leave epsilons for epsilon closure
                    allIDs.add(t.label);
                }
            }
        }
        return allIDs;
    }
    function move(states, id) {
        // return new states, from each state in states traverse the id
        const result = new Set();
        for(const n of states) {
            for(const t of n.transitions) {
                if(t.label === id) {
                    result.add(t.next);
                }
            }
        }
        return result;
    }

    // nfa_for_current_regex is available nfa to use
    // maxLengthToDisplay is available size limit to use
    const acceptNode = nfa_for_current_regex.accept;
    const maxResults = 1000; // upper limit to display incase maxLength is too large
    let generatedStrings = [];
    let queue = [
        {
            states: epsilonClosure(new Set([nfa_for_current_regex.start])),
            str: ""
        }
    ]; // array of objects, where each one is a set of states and the built str so far

    while(queue.length > 0 && generatedStrings.length < maxResults) {
        const { states, str } = queue.shift();

        // check if there is an accepted string
        for(const n of states) {
            if(n == acceptNode) {
                generatedStrings.push(str);
                break;
            }
        }

        // stop expanding this branch if maxlength reached
        if(str.length >= maxLengthToDisplay) {
            continue;
        }

        // get ids to traverse next
        const nextIDs = getSymbols(states);
        for(const id of nextIDs) {
            const nextStates = epsilonClosure(move(states, id));

            if(nextStates.size > 0) {
                queue.push({
                    states: nextStates,
                    str: str + id
                });
            }
        }
    }
    return generatedStrings;
}

// output strings from generatedStrings
function render(generatedStrings) {
    regexOutput.textContent = '';
    for(const nextStr of generatedStrings) {
        // long IDs may push a certain string over maxLengthToDisplay
        // manually enforce size limits
        if(nextStr.length > maxLengthToDisplay) {
            continue;
        }
        // handle epsilon generated manually
        if(nextStr.length === 0) {
            const p = document.createElement("p");
            p.textContent = '_';
            regexOutput.appendChild(p);
        } else {
            const p = document.createElement("p");
            p.textContent = nextStr;
            regexOutput.appendChild(p);
        }
    }
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

    // reload regexes
    render(updateGeneratedStrings());
});
