var TypingState = Backbone.Model.extend({
	"defaults" : {
		"allTokens" : "",
		"mtText" : "",
		"userText" : "",
		"caretCharIndex" : -1,
		"selectionCharIndex" : 0,
		"selectionStartCharIndex" : 0,  // For rendering and bound [ 0, userText.length ]
		"selectionEndCharIndex" : 0,    // For rendering and bound [ 0, userText.length ]
		"selectionDirection" : "none",
		"isGhostCaret" : false,
		"isExpired" : false,
		"syncKey" : 0
	}
});

/** @private **/
TypingState.prototype.WHITESPACE = /([ ]+)/g;

/**
 * Reset the content of the Typing UI.
 * @param {string} mtText Content of the Typing UI.
 * @param {string} userText Prefix to be marked as user-entered text.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.setText = function( mtText, userText, caretCharIndex, selectionCharIndex ) {
	if ( ! caretCharIndex ) { caretCharIndex = ( this.get( "caretCharIndex" ) === -1 ) ? userText.length : this.get( "caretCharIndex" ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }
	
	var allTokens = this.__initAllTokens( mtText, userText );
	this.__markActiveToken( allTokens, caretCharIndex );
	this.__markLookups( allTokens );

	this.set( "allTokens", allTokens );
	this.set( "mtText", mtText );
	this.set( "userText", userText );
	this.__setSelectionCharIndexes( caretCharIndex, selectionCharIndex );
	this.set( "isExpired", false );
	this.trigger( "modified" );
	return this;
};

/**
 * Incrementally update the content of the Typing UI.
 * Detect changes and mark corresponding tokens as expired or changed.
 * @param {string} userText Content of the Typing UI.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.updateText = function( userText, caretCharIndex, selectionCharIndex ) {
	if ( ! caretCharIndex ) { caretCharIndex = this.get( "caretCharIndex" ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }
	
	var allTokens = this.get( "allTokens" );
	this.__updateAllTokens( allTokens, userText )
	this.__markActiveToken( allTokens, caretCharIndex );
	this.__markLookups( allTokens );

	this.set( "userText", userText );
	this.__setSelectionCharIndexes( caretCharIndex, selectionCharIndex );
	if ( this.__checkForUpdates( allTokens ) ) {
		this.set( "isExpired", true );
		this.triggerUpdate();
	}
	this.trigger( "modified" );
	return this;
};

TypingState.prototype.updateCaret = function( caretCharIndex, selectionCharIndex ) {
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }

	var allTokens = this.get( "allTokens" );
	this.__markActiveToken( allTokens, caretCharIndex );
	this.__markLookups( allTokens );

	this.__setSelectionCharIndexes( caretCharIndex, selectionCharIndex );
	if ( this.__checkForUpdates( allTokens ) ) {
		this.set( "isExpired", true );
		this.triggerUpdate();
	}
	this.trigger( "modified" );
	return this;
};

/** @private **/
TypingState.prototype.__initAllTokens = function( mtText, userText ) {
	var mtTermsAndSeps = mtText.split( this.WHITESPACE );
	var mtLength = ( mtTermsAndSeps.length + 1 ) / 2;
	var userTermsAndSeps = userText.split( this.WHITESPACE );
	var userLength = ( userTermsAndSeps.length + 1 ) / 2;
	chai.assert( userLength <= mtLength );
	
	var allTokens = _.range( mtLength ).map( function( n ) { return { "index" : n } } );
	
	for ( var n = 0; n < mtLength; n++ ) {
		var token = allTokens[ n ];
		var mtTerm = mtTermsAndSeps[ n * 2 ];
		var mtSep = ( n < mtLength - 1 ) ? mtTermsAndSeps[ n * 2 + 1 ] : "";
		var userTerm = ( n < userLength ) ? userTermsAndSeps[ n * 2 ] : "";
		var userSep = ( n < userLength - 1 ) ? userTermsAndSeps[ n * 2 + 1 ] : "";
		if ( userTerm !== "" ) { chai.assert.equal( mtTerm, userTerm ) }
		if ( userSep !== "" ) { chai.assert.equal( mtSep, userSep ) }
		token.mtTerm = mtTerm;
		token.mtSep = mtSep;
		token.userTerm = userTerm;
		token.userSep = userSep;
		token.isUser = ( userTerm !== "" );
	}
	return allTokens;
};

/** @private **/
TypingState.prototype.__updateAllTokens = function( allTokens, userText ) {
	var userTermsAndSeps = userText.split( this.WHITESPACE );
	var userLength = ( userTermsAndSeps.length + 1 ) / 2;
	
	var length = Math.max( allTokens.length, userLength );
	for ( var n = 0; n < length; n++ ) {
		if ( n < userLength ) {
			var userTerm = userTermsAndSeps[ n * 2 ];
			var userSep = ( n < userLength - 1 ) ? userTermsAndSeps[ n * 2 + 1 ] : "";
			if ( n < allTokens.length ) {
				var token = allTokens[ n ];
				token.userTerm = userTerm;
				token.userSep = userSep;
			}
			else {
				var token = {};
				token.mtTerm = "";
				token.mtSep = "";
				token.userTerm = userTerm;
				token.userSep = userSep;
				allTokens.push( token );
			}
		}
		else {
			if ( n < allTokens.length ) {
				var token = allTokens[ n ];
				token.userTerm = "";
				token.userSep = "";
			}
		}
	}
};

/** @private **/
TypingState.prototype.__markActiveToken = function( allTokens, caretCharIndex ) {
	var charIndex = 0;
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		token.term = ( token.userTerm !== "" ) ? token.userTerm : token.mtTerm;
		token.sep = ( token.userSep !== "" ) ? token.userSep : token.mtSep;
		var startCharIndex = charIndex;
		charIndex += token.term.length;
		var endCharIndex = charIndex;
		charIndex += token.sep.length;
		var atOrBeforeCaret = ( caretCharIndex <= endCharIndex );
		var atOrAfterCaret = ( startCharIndex <= caretCharIndex );
		var isActive = ( atOrBeforeCaret && atOrAfterCaret );
		token.startCharIndex = startCharIndex;
		token.endCharIndex = endCharIndex;
		token.atOrBeforeCaret = atOrBeforeCaret;
		token.atOrAfterCaret = atOrAfterCaret;
		token.isActive = isActive;
	}
};

/** @private **/
TypingState.prototype.__markLookups = function( allTokens ) {
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		token.lookups = [];
	}
};

/** @private **/
TypingState.prototype.__checkForUpdates = function( allTokens ) {
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		if ( ( token.isUser && token.mtTerm !== token.userTerm ) || ( ! token.isUser && token.userTerm !== "" ) ) {
			if ( ! token.isActive ) {
				return true;
			}
		}
	}
	return false;
};

/** @private **/
TypingState.prototype.__setSelectionCharIndexes = function( caretCharIndex, selectionCharIndex ) {
	this.set( "caretCharIndex", caretCharIndex );
	this.set( "selectionCharIndex", selectionCharIndex );

	var userText = this.get( "userText" );
	var maxCharIndex = userText.length;
	var boundCaretCharIndex = Math.min( maxCharIndex, caretCharIndex );
	var boundSelectionCharIndex = Math.min( maxCharIndex, selectionCharIndex );
	var isGhostCaret = boundCaretCharIndex < caretCharIndex;
	this.set( "isGhostCaret", isGhostCaret );
	if ( selectionCharIndex === caretCharIndex ) {
		this.set( "selectionStartCharIndex", boundCaretCharIndex );
		this.set( "selectionEndCharIndex", boundCaretCharIndex );
		this.set( "selectionDirection", "none" );
	}
	else if ( selectionCharIndex < caretCharIndex ) {
		this.set( "selectionStartCharIndex", boundSelectionCharIndex );
		this.set( "selectionEndCharIndex", boundCaretCharIndex );
		this.set( "selectionDirection", "forward" );
	}
	else {
		this.set( "selectionStartCharIndex", boundCaretCharIndex );
		this.set( "selectionEndCharIndex", boundSelectionCharIndex );
		this.set( "selectionDirection", "backward" );
	}
};

/**
 * Trigger an event to update translation.
 **/
TypingState.prototype.triggerUpdate = function() {
	var syncKey = this.get( "syncKey" );
	syncKey ++;
	this.set( "syncKey", syncKey );
	this.trigger( "token", syncKey );
	return this;
};

TypingState.prototype.getSyncKey = function() {
	var syncKey = this.get( "syncKey" );
	return syncKey;
};

/**
 * Get user-entered text (i.e., sentencee prefix) for generating the machine translation.
 **/
TypingState.prototype.getUserText = function() {
	return this.get( "userText" );
};
