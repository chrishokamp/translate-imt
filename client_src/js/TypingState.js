var TypingState = Backbone.Model.extend({
	"defaults" : {
		"allTokens" : "",
		"mtTexts" : [],           // A list of machine translations
		"userText" : "",          // User-entered translation
		"ghostText" : "",         // Best machine translation based on the current user-entered text
		"caretCharIndex" : 0,     // Caret location; may extend beyond the boundary of userText.
		"selectionCharIndex" : 0, // Location of text selection boundary, whichever end that is opposite from caret location; may extend beyond the boundary of userText.
		"selectionStartCharIndex" : 0,  // For rendering purposes: value is bounded between [ 0, userText.length ]
		"selectionEndCharIndex" : 0,    // For rendering purposes: value is bounded between [ 0, userText.length ]
		"selectionDirection" : "none",  // For rendering purposes: none, forward, or backward
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
 * @param {string[]} mtTexts A list of machine translations.
 * @param {string} userText User-entered text
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.initTranslationAndUserText = function( mtTexts, userText, caretCharIndex, selectionCharIndex ) {
	if ( ! caretCharIndex ) { caretCharIndex = this.get( "caretCharIndex" ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }
	
	var allTokens = this.__initAllTokens( mtTexts, userText );
	this.__markActiveToken( allTokens, caretCharIndex );

	this.set( "allTokens", allTokens );
	this.set( "mtTexts", mtTexts )
	this.set( "userText", userText );
	this.set( "caretCharIndex", caretCharIndex );
	this.set( "selectionCharIndex", selectionCharIndex );
	this.__setSelectionCharIndexes();
	this.set( "isExpired", false );
	this.trigger( "modified" );
};

/**
 * Incrementally update the machine translation.
 * @param {string[]} mtTexts A list of machine translations.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.updateTranslation = function( mtTexts, caretCharIndex, selectionCharIndex ) {
	var userText = this.getUserText();
	if ( ! caretCharIndex ) { caretCharIndex = this.get( "caretCharIndex" ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }

	var allTokens = this.__initAllTokens( mtTexts, userText );
	this.__markActiveToken( allTokens, caretCharIndex );

	this.set( "allTokens", allTokens );
	this.set( "mtTexts", mtTexts );
	this.set( "caretCharIndex", caretCharIndex );
	this.set( "selectionCharIndex", selectionCharIndex );
	this.__setSelectionCharIndexes();
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

	this.set( "userText", userText );
	this.set( "caretCharIndex", caretCharIndex );
	this.set( "selectionCharIndex", selectionCharIndex );
	this.__setSelectionCharIndexes();
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

	this.set( "caretCharIndex", caretCharIndex );
	this.set( "selectionCharIndex", selectionCharIndex );
	this.__setSelectionCharIndexes();
	if ( this.__checkForUpdates( allTokens ) ) {
		this.set( "isExpired", true );
		this.__prepareSync();
	}
	this.trigger( "modified" );
};

/** @private **/
TypingState.prototype.__initAllTokens = function( mtTexts, userText ) {
	var mtTermsAndSepsList = [];
	var mtLengthList = [];
	var maxLength = 0;
	for ( var k = 0; k < mtTexts.length; k++ ) {
		var mtText = mtTexts[ k ];
		var mtTermsAndSeps = mtText.split( this.WHITESPACE );
		var mtLength = ( mtTermsAndSeps.length + 1 ) / 2;
		mtTermsAndSepsList.push( mtTermsAndSeps );
		mtLengthList.push( mtLength );
		maxLength = Math.max( maxLength, mtLength );
	}
	var userTermsAndSeps = userText.split( this.WHITESPACE );
	var userLength = ( userTermsAndSeps.length + 1 ) / 2;
	var maxLength = Math.max( maxLength, userLength );
	
	var allTokens = _.range( maxLength ).map( function( n ) {
		return {
			"mtTerms" : [],
			"mtSeps" : [],
			"userTerm" : "",
			"userSep" : "",
			"prefixTerm" : "",
			"isChanged" : false
		}
	});
	
	for ( var k = 0; k < mtTexts.length; k++ ) {
		var mtTermsAndSeps = mtTermsAndSepsList[ k ];
		var mtLength = mtLengthList[ k ];
		for ( var n = 0; n < mtLength; n++ ) {
			var token = allTokens[ n ];
			var mtTerm = mtTermsAndSeps[ n * 2 ];
			var mtSep = ( n < mtLength - 1 ) ? mtTermsAndSeps[ n * 2 + 1 ] : "";
			if ( token.mtTerms.indexOf( mtTerm ) === -1 ) {
				token.mtTerms.push( mtTerm );
			}
			if ( token.mtSeps.indexOf( mtSep ) === -1 ) {
				token.mtSeps.push( mtSep );
			}
		}
	}
	for ( var n = 0; n < userLength; n++ ) {
		var token = allTokens[ n ];
		var userTerm = userTermsAndSeps[ n * 2 ];
		var userSep = ( n < userLength - 1 ) ? userTermsAndSeps[ n * 2 + 1 ] : "";
		token.userTerm = userTerm;
		token.userSep = userSep;
		token.prefixTerm = userTerm;
	}
	
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[n];
		var nextToken = ( n < allTokens.length - 1 ) ? allTokens[ n + 1 ] : allTokens[ 0 ];
		token.nextToken = nextToken;
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
				token.mtTerms = [];
				token.mtSeps = [];
				token.userTerm = userTerm;
				token.userSep = userSep;
				token.prefixTerm = "";
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
		
		token.mtTerm = this.__getBestMtTerm( token.mtTerms, token.userTerm );
		token.mtSep = this.__getBestMtSep( token.mtSeps, token.userSep );
		token.term = token.userTerm + token.mtTerm.substr( token.userTerm.length );
		token.sep = token.userSep + token.mtSep.substr( token.userSep.length );
		
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
TypingState.prototype.__getBestMtTerm = function( mtTerms, userTerm ) {
	if ( mtTerms.length === 0 ) {
		return "";
	}
	var userLength = userTerm.length;
	if ( userLength === 0 ) {
		return mtTerms[ 0 ];
	}
	for ( var k = 0; k < mtTerms.length; k++ ) {
		var mtTerm = mtTerms[ k ];
		if ( userTerm === mtTerm.substr( 0, userLength ) ) {
			return mtTerm;
		}
	}
	return "";
};

/** @private **/
TypingState.prototype.__getBestMtSep = function( mtSeps, userSep ) {
	if ( mtSeps.length === 0 ) {
		return "";
	}
	else {
		return mtSeps[ 0 ];
	}
};

/** @private **/
TypingState.prototype.__checkForUpdates = function( allTokens ) {
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		if ( token.prefixTerm !== token.userTerm ) {
			if ( ! token.isActive && ! token.isChanged ) {
				token.isChanged = true;
				return true;
			}
		}
	}
	return false;
};

/** @private **/
TypingState.prototype.__setSelectionCharIndexes = function() {
	var caretCharIndex = this.get( "caretCharIndex" );
	var selectionCharIndex = this.get( "selectionCharIndex" );
	
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

/** @private **/
TypingState.prototype.__triggerSync = function( syncKey ) {
	this.__incrementSyncKey();
	var syncKey = this.get( "syncKey" );
	this.trigger( "syncTranslation", syncKey );
	console.log( "Sent HTTP request (key=" + syncKey + ")" );
}

/** @private **/
TypingState.prototype.syncTranslation = function( key, translation ) {
	var syncKey = this.get( "syncKey" );
	if ( syncKey === key ) {
		this.updateTranslation( translation );
		console.log( "Received HTTP response (key=" + key + ")" );
		return true;
	}
	else {
		console.log( "Discarded outdated HTTP response (key=" + key + ")" );
		return false;
	}
};

/** @private **/
TypingState.prototype.__incrementSyncKey = function() {
	this.set( "syncKey", this.get( "syncKey" ) + 1 );
};

/**
 * Get user-entered text (i.e., sentencee prefix) for generating the machine translation.
 **/
TypingState.prototype.getUserText = function() {
	return this.get( "userText" );
};
