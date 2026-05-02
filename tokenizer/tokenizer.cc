// Written by Benjamin Reichler

// Backend for regex_string_generator
// used to parse input text into Token objects 
// and return them to stdout in json format

// compiled with lexical analyzer files from regex_string_generator/ dir using:
// g++ -Werror -Wall ./tokenizer/tokenizer.cc ./tokenizer/lexer/src/*.cc -Itokenizer/lexer/include -o ./tokenizer.exe

#include <iostream>
#include <string>
#include <vector>

#include "lexical_analyzer.h"

int main(int argc, char* argv[]) {
    if(argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <regex_str>" << std::endl;
        return 1;
    }

    std::vector<std::string> tokenTypeNames = { "OR", "STAR", "LPAREN", "RPAREN", "ID" };
    std::vector<std::string> tokenRegexes = { R"(\|)", R"(\*)", R"(\()", R"(\))", R"([a-zA-Z0-9_-]+)" };

    // this isn't necessary because execFile in server.js always executes the file with a single argument
    // make sure input string isn't accidentally split across different args
    std::string in = argv[1];
    for(int i = 2; i < argc; i++) {
        // to preserve spaces: in += " ";
        in += argv[i];
    }

    std::istringstream inputStream(in);

    LexicalAnalyzer lexer{inputStream, tokenTypeNames, tokenRegexes};

    // format JSON output

    std::string out = "[";
    Token t = lexer.getToken();
    while(t.tokenType != lexer.getEOFTokenType()) {

        out += "{\"type\":\"" + t.tokenType.getTokenType();
        out += "\",\"lexeme\":\"" + t.lexeme;
        out += "\"},";

        t = lexer.getToken();
    }
    // t is EOF, end out with EOF token
    out += "{\"type\":\"" + t.tokenType.getTokenType();
    out += "\",\"lexeme\":\"" + t.lexeme;
    out += "\"}";

    // close JSON
    out += "]";

    std::cout << out << std::endl;

    return 0;
}
