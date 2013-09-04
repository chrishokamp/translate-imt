var TypingState = Backbone.Model.extend({
	"defaults" : {
		"userText" : "",
		"matchedText" : "",		// Derived from userText
		"matchedTokens" : [],	// Derived from userText
		"currentTerm" : "",		// Derived from userText
		"suggestions" : [],
		"futureText" : "",
		"futureTokens" : [],	// Derived from futureText
		"ui:caretCharIndex" : 0,
		"ui:selectionStartCharIndex" : 0,
		"ui:selectionEndCharIndex" : 0
	}
});

TypingState.prototype.initialize = function( options ) {
	this.on( "change", function() { this.flush() }.bind(this) );
};

TypingState.prototype.setCaretIndex = function( charIndex ) {
	this.setAttr( "ui:caretCharIndex", charIndex );
};

TypingState.prototype.setSelectedIndexes = function( startCharIndex, endCharIndex ) {
	if ( startCharIndex === undefined ) { startCharIndex = 0 }
	if ( endCharIndex === undefined ) { endCharIndex = startCharIndex }
	if ( endCharIndex < startCharIndex ) { endCharIndex = startCharIndex }
	this.setAttr( [ "ui:selectionStartCharIndex", "ui:selectionEndCharIndex" ], [ startCharIndex, endCharIndex ] );
};

/**
 * Set user-entered text (intended for development use only).
 * @param {String} text User-entered text.
 **/
TypingState.prototype.setUserText = function( userText ) {
	// This regular expression should always yield an odd number of "termsAndSeps" values
	// The odd entries are terms (for a total of N+1 terms)
	// The even entries are separators (for a total of N separators)
	var termsAndSeps = userText.split( /([ ]+)/g );
	
	// The first N terms and separators are referred to as "matched"
	var matchedLength = ( termsAndSeps.length - 1 ) / 2;
	var matchedText = termsAndSeps.slice( 0, termsAndSeps.length - 2 ).join("");
	var matchedTokens = new Array( matchedLength );
	for ( var i = 0; i < matchedLength; i++ ) {
		var term = termsAndSeps[ i * 2 ];
		var sep = termsAndSeps[ i * 2 + 1 ];
		var token = { "text" : term, "sep" : sep };
		matchedTokens[ i ] = token;
	}
	// The final term is referred to as "current"
	var currentTerm = termsAndSeps[ termsAndSeps.length - 1 ];
	
	this.setAttr( [ "userText", "matchedText", "matchedTokens", "currentTerm" ], [ userText, matchedText, matchedTokens, currentTerm ] );
	return this;
};

/**
 * Retrieve the full text as entered by the user.
 * @return {String} User-entered text.
 **/
TypingState.prototype.getUserText = function() {
	return this.getAttr( "userText" );
};

/**
 * Retrieve all terms except the last one, as entered by the user.
 * @return {String} User-entered text.
 **/

/**
 * Retrieve the final term entered by the user.
 * @return {String} User-enterd text.
 **/
TypingState.prototype.getCurrentTerm = function() {
	return this.getAttr( "currentTerm" );
};

/**
 * Set autocomplete suggestions for the current term.
 * @param {String[]} suggestions A list of suggested terms.
 **/
TypingState.prototype.setSuggestions = function( suggestions ) {
	this.setAttr( "suggestions", suggestions );
	return this;
};

/**
 * Set machine-translated text (excluding matched text and current term).
* @param {String} text Machine translation.
 **/
TypingState.prototype.setFutureText = function( futureText ) {
	var terms = futureText.split( /[ ]+/g );
	var futureLength = terms.length;
	var futureTokens = new Array( futureLength );
	for ( var i = 0; i < futureLength; i++ ) {
		var term = terms[ i ];
		var sep = ( i === futureLength - 1 ) ? "" : " ";
		var token = { "text" : term, "sep" : sep };
		futureTokens[ i ] = token;
	}
	this.setAttr( [ "futureText", "futureTokens" ], [ futureText, futureTokens ] );
	return this;
};

/**
 * Set machine-translated text (excluding matched text and current term).
* @param {String[]} terms A list of machine-translated terms.
 **/
TypingState.prototype.setFutureTerms = function( terms ) {
	var futureText = terms.join( " " );
	var futureLength = terms.length;
	var futureTokens = new Array( futureLength );
	for ( var i = 0; i < futureLength; i++ ) {
		var term = terms[ i ];
		var sep = ( i === futureLength - 1 ) ? "" : " ";
		var token = { "text" : term, "sep" : sep };
		futureTokens[ i ] = token;
	}
	this.setAttr( [ "futureText", "futureTokens" ], [ futureText, futureTokens ] );
	return this;
};
