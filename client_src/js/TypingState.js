var TypingState = Backbone.Model.extend({
	"defaults" : {
		"allTokens" : "",
		"mtText" : "",
		"userText" : "",
		"caretCharIndex" : 0,
		"selectionCharIndex" : 0,
		"selectionStartCharIndex" : 0,  // For rendering and bound [ 0, userText.length ]
		"selectionEndCharIndex" : 0,    // For rendering and bound [ 0, userText.length ]
		"selectionDirection" : "none",
		"isGhostCaret" : false,
		"isExpired" : false,
		"syncKey" : 0
	}
});

TypingState.prototype.initialize = function() {
	this.__prepareSync = _.debounce( this.__triggerSync, 500, true );
}

/** @private **/
TypingState.prototype.WHITESPACE = /([ ]+)/g;

/**
 * Initialize the TypingUI with both machine translation and user-entered text.
 * @param {string} mtText Machine translation.
 * @param {string} userText User-entered text
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.initTranslationAndUserText = function( mtText, userText, caretCharIndex, selectionCharIndex ) {
	if ( ! caretCharIndex ) { caretCharIndex = this.get( "caretCharIndex" ) }
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
};

/**
 * Incrementally update the machine translation.
 * @param {string} mtText Machine translation.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.updateTranslation = function( mtText, caretCharIndex, selectionCharIndex ) {
	if ( ! caretCharIndex ) { caretCharIndex = this.get( "caretCharIndex" ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }
	
	var userText = this.getUserText();
	var allTokens = this.__initAllTokens( mtText, userText );
	this.__markActiveToken( allTokens, caretCharIndex );
	this.__markLookups( allTokens );

	this.set( "allTokens", allTokens );
	this.set( "mtText", mtText );
	this.__setSelectionCharIndexes( caretCharIndex, selectionCharIndex );
	this.set( "isExpired", false );
	this.trigger( "modified" );
};

/**
 * Incrementally update user-entered text.
 * @param {string} userText User-entered text.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.updateUserText = function( userText, caretCharIndex, selectionCharIndex ) {
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
		this.__prepareSync();
	}
	this.trigger( "modified" );
};

/**
 * Update the location of the caret.
 * @param {integer} caretCharIndex Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.updateCaret = function( caretCharIndex, selectionCharIndex ) {
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }

	var allTokens = this.get( "allTokens" );
	this.__markActiveToken( allTokens, caretCharIndex );
	this.__markLookups( allTokens );

	this.__setSelectionCharIndexes( caretCharIndex, selectionCharIndex );
	if ( this.__checkForUpdates( allTokens ) ) {
		this.set( "isExpired", true );
		this.__prepareSync();
	}
	this.trigger( "modified" );
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
		token.mtTerm = mtTerm;
		token.mtSep = mtSep;
		token.userTerm = userTerm;
		token.userSep = userSep;
		token.original = userTerm;
		token.isChanged = false;
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
				token.original = "";
				token.isChanged = false;
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
		token.isUser = ( token.userTerm !== "" );
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
		if ( token.original !== token.userTerm ) {
			if ( ! token.isActive && ! token.isChanged ) {
				token.isChanged = true;
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

TypingState.prototype.__triggerSync = function( syncKey ) {
	this.__incrementSyncKey();
	var syncKey = this.get( "syncKey" );
	this.trigger( "syncTranslation", syncKey );
	console.log( "Sent HTTP request (key=" + syncKey + ")" );
}

TypingState.prototype.syncTranslation = function( key, translation ) {
	var syncKey = this.get( "syncKey" );
	if ( syncKey === key ) {
		this.updateTranslation( translation );
		console.log( "Received HTTP response (key=" + syncKey + ")" );
		return true;
	}
	else {
		console.log( "Discarded outdated HTTP response (key=" + syncKey + ")" );
		return false;
	}
};

TypingState.prototype.__incrementSyncKey = function() {
	this.set( "syncKey", this.get( "syncKey" ) + 1 );
};

/**
 * Get user-entered text (i.e., sentencee prefix) for generating the machine translation.
 **/
TypingState.prototype.getUserText = function() {
	return this.get( "userText" );
};
