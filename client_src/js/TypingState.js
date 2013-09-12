var TypingState = Backbone.Model.extend({
	"defaults" : {
		"allText" : "",
		"userText" : "",
		"userTokens" : [], 		// Derived from userText
		"userActive" : "",		// Derived from userText
		"futureText" : "",
		"futureTokens" : [],	// Derived from futureText
		"futureActive" : "",	// Derived from futureText
		"suggestions" : [],
		"caretCharIndex" : 0,
		"selectionStartCharIndex" : 0,
		"selectionEndCharIndex" : 0
	}
});

TypingState.prototype.setCaretIndex = function( charIndex ) {
	var maxCharIndex = this.getAttr( "allText" ).length;
	if ( charIndex >= maxCharIndex ) { charIndex = maxCharIndex }
	var minCharIndex = 0;
	if ( charIndex < minCharIndex ) { charIndex = minCharIndex }
	this.setAttr( "caretCharIndex", charIndex );
	this.flush();
	return this;
};

TypingState.prototype.incrementCaretIndex = function() {
	var charIndex = this.getAttr( "caretCharIndex" );
	return this.setCaretIndex( charIndex + 1 );
};

TypingState.prototype.decrementCaretIndex = function() {
	var charIndex = this.getAttr( "caretCharIndex" );
	return this.setCaretIndex( charIndex - 1 );
};

TypingState.prototype.setSelectedIndexes = function( startCharIndex, endCharIndex ) {
	if ( startCharIndex === undefined ) { startCharIndex = 0 }
	if ( endCharIndex === undefined ) { endCharIndex = startCharIndex }
	this.setAttr( [ "selectionStartCharIndex", "selectionEndCharIndex" ], [ startCharIndex, endCharIndex ] );
	this.flush();
	return this;
};

/**
 * Set user-entered text (intended for development use only).
 * @param {String} text User-entered text.
 **/
TypingState.prototype.setUserText = function( userText ) {
	this.setAttr( "userText", userText );
	this.__processUserText();
	this.__compileAllText();
	this.flush();
	return this;
};

/**
 * Set machine-translated text (excluding user text).
* @param {String} text Machine translation.
 **/
TypingState.prototype.setFutureText = function( futureText ) {
	this.setAttr( "futureText", futureText );
	this.__processFutureText();
	this.__compileAllText();
	this.flush();
	return this;
};

TypingState.prototype.setAllText = function( allText, caretCharIndex, selectionStartCharIndex, selectionEndCharIndex ) {
	this.setAttr( "allText", allText );
	this.setAttr( "caretCharIndex", caretCharIndex );
	this.setAttr( [ "selectionStartCharIndex", "selectionEndCharIndex" ], [ selectionStartCharIndex, selectionEndCharIndex ] );
	this.__processAllText();
	this.__processUserText();
	this.__processFutureText();
	this.flush();
	return this;
};

/**
 * Set autocomplete suggestions for the current term.
 * @param {String[]} suggestions A list of suggested terms.
 **/
TypingState.prototype.setSuggestions = function( suggestions ) {
	this.setAttr( "suggestions", suggestions );
	return this;
};

TypingState.prototype.getUserText = function() {
	return this.getAttr( "userText" );
};

TypingState.prototype.refreshFutureText = function() {
	this.trigger( "token" );
};

/**
 * Split userText into a list of userTokens and a string representing the userActive.
 * @param {string} userText User-entered translation.
 **/
TypingState.prototype.__processUserText = function() {
	var userText = this.getAttr( "userText" );
	
	// This regular expression always yields an odd number of "termsAndSeps" values
	// The odd entries are terms (for a total of N+1 terms)
	// The even entries are separators (for a total of N separators)
	var termsAndSeps = userText.split( /([ ]+)/g );
	
	// The first N terms and separators are referred to as "userTokens"
	var userLength = ( termsAndSeps.length - 1 ) / 2;
	var userTokens = new Array( userLength );
	for ( var i = 0; i < userLength; i++ ) {
		var term = termsAndSeps[ i * 2 ];
		var sep = termsAndSeps[ i * 2 + 1 ];
		var token = { "text" : term, "sep" : sep };
		userTokens[ i ] = token;
	}
	this.setAttr( "userTokens", userTokens );

	// The final term is referred to as "userActive"
	var userActive = termsAndSeps[ termsAndSeps.length - 1 ];
	this.setAttr( "userActive", userActive );
};

TypingState.prototype.__processFutureText = function() {
	var futureText = this.getAttr( "futureText" );
	
	// This regular expression always yields an odd number of "termsAndSeps" values
	// The odd entries are terms (for a total of N+1 terms)
	// The even entries are separators (for a total of N separators)
	var termsAndSeps = futureText.split( /([ ]+)/g );
	
	// The final N terms and separators are referred to as "futureTokens"
	var futureLength = ( termsAndSeps.length - 1 ) / 2;
	var futureTokens = new Array( futureLength );
	for ( var i = 1; i <= futureLength; i++ ) {
		var term = termsAndSeps[ i * 2 ];
		var sep = ( i === futureLength ) ? "" : termsAndSeps[ i * 2 + 1 ];
		var token = { "text" : term, "sep" : sep };
		futureTokens[ i-1 ] = token;
	}
	this.setAttr( "futureTokens", futureTokens );

	// The first term is referred to as "futureActive"
	var futureActive = termsAndSeps[ 0 ];
	this.setAttr( "futureActive", futureActive );
};

/**
 * Generate allText from userText and futureText.
 **/
TypingState.prototype.__compileAllText = function() {
	var userText = this.getAttr( "userText" );
	var futureText = this.getAttr( "futureText" );
	var allText = userText + futureText;
	this.setAttr( "allText", allText );
};

/**
 * Generate userText and futureText from allText, based on the previous value of futureText.
 **/
TypingState.prototype.__processAllText = function() {
	var allText = this.getAttr( "allText" );
	var allLength = allText.length;
	var futureText = this.getAttr( "futureText" );
	var futureLength = futureText.length;
	var caretCharIndex = this.getAttr( "caretCharIndex" );
	for ( var split = 0; split < allLength - caretCharIndex && split < futureLength; split++ ) {
		var allChar = allText.charCodeAt( allLength - split - 1 );
		var futureChar = futureText.charCodeAt( futureLength - split - 1 );
		if ( allChar !== futureChar )
			break;
	}
	var userText = allText.substr( 0, allLength - split );
	var futureText = futureText.substr( futureLength - split );
	console.log( this.get( "futureText" ), "-->", futureText );
	this.setAttr( "userText", userText );
	this.setAttr( "futureText", futureText );
};
