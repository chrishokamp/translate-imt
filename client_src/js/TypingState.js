var TypingState = Backbone.Model.extend({
	"defaults" : {
		"allTokens" : "",
		"allText" : "",
		"mtText" : "",
		"userText" : "",
		"caretCharIndex" : 0,
		"selectionStartCharIndex" : 0,
		"selectionEndCharIndex" : 0,
		"selectionDirection" : "none"
	}
});

/**
 * Reset the content of the Typing UI.
 * @param {string} [mtText] Content of the Typing UI.
 * @param {string} [userText] Prefix to be marked as user-entered text.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 **/
TypingState.prototype.setText = function( mtText, userText, caretCharIndex, selectionCharIndex ) {
	// Default values for arguments
	if ( ! mtText ) { mtText = "" }
	if ( ! userText ) { userText = "" }
	if ( ! caretCharIndex ) { caretCharIndex = this.getAttr( caretCharIndex ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }
	
	// Generate a list of tokens
	var allTokens = this.__tokenize( mtText );
	this.__markMtText( allTokens, mtText );
	this.__markUserText( allTokens, userText );
	var caretCharIndex = this.__markActiveToken( allTokens, caretCharIndex );
	var allText = this.__compile( allTokens );
	
	// Set state attributes
	this.setAttr( "allTokens", allTokens );
	this.setAttr( "mtText", mtText );
	this.setAttr( "userText", userText );
	this.__setCharIndexes( caretCharIndex, selectionCharIndex );
	this.flush();
	return this;
};

/**
 * Incrementally update the content of the Typing UI.
 * Detect changes and mark corresponding tokens as expired or changed.
 * @param {string} allText Content of the Typing UI.
 * @param {integer} [caretCharIndex] Location of the caret.
 * @param {integet} [selectionCharIndex] Location of the opposite end of selection from the caret.
 * @param {boolean} [forceExpire] Force
 **/
TypingState.prototype.updateText = function( newText, caretCharIndex, selectionCharIndex, forceExpire ) {
	// Default values for arguments
	if ( ! newText ) { newText = "" }
	if ( ! caretCharIndex ) { caretCharIndex = this.getAttr( caretCharIndex ) }
	if ( ! selectionCharIndex ) { selectionCharIndex = caretCharIndex }
	if ( ! forceExpire ) { forceExpire = false }
	
	// Determine changes in tokens
	var allTokens = this.getAttr( "allTokens" );
	var newTokens = this.__tokenize( newText );
	if ( forceExpire || allTokens.length !== newTokens.length ) {
		var mtText = this.getAttr( "mtText" );
		this.__markMtExpired( newTokens, newText );
		this.__markCharIndex( newTokens );
		this.__markUserAccepted( newTokens, newText, caretCharIndex );
		this.__markActiveToken( newTokens, caretCharIndex );
		allTokens = newTokens;
	}
	else {
		this.__markUesrChanged( allTokens, newTokens );
		this.__markCharIndex( allTokens );
		this.__markActiveToken( allTokens, caretCharIndex );
	}
	
	// Set state attributes
	this.setAttr( "allTokens", allTokens );
	this.__setCharIndexes( caretCharIndex, selectionCharIndex );
	this.flush();
	return this;
};

TypingState.prototype.__tokenize = function( allText ) {
	var termsAndSeps = allText.split( this.WHITESPACE );
	var length = ( termsAndSeps.length + 1 ) / 2;
	var allTokens = new Array( length );
	for ( var n = 0; n < length; n++ ) {
		var term = termsAndSeps[ n * 2 ];
		var sep = ( n < length - 1 ) ? termsAndSeps[ n * 2 + 1 ] : "";
		var token = { "term" : term, "sep" : sep };
		allTokens[ n ] = token;
	}
	return allTokens;
};

TypingState.prototype.__markMtText = function( allTokens, mtText ) {
	var termsAndSeps = mtText.split( this.WHITESPACE );
	var length = ( termsAndSeps.length + 1 ) / 2;
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var term = ( n < length ) ? termsAndSeps[ n * 2 ] : "";
		var isMt = ( n < length );
		token.mt = term;
		token.isMt = isMt;
		token.isExpired = false;
	}
};

TypingState.prototype.__markUserText = function( allTokens, userText ) {
	var termsAndSeps = userText.split( this.WHITESPACE );
	var length = ( termsAndSeps.length + 1 ) / 2;
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var term = ( n < length ) ? termsAndSeps[ n * 2 ] : "";
		var isUser = ( n < length );
		token.user = term;
		token.isUser = isUser;
		token.isChanged = false;
	}
};

TypingState.prototype.__markActiveToken = function( allTokens, caretCharIndex ) {
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var startCharIndex = token.charIndex;
		var endCharIndex = startCharIndex + token.term.length;
		token.original = token.term;
		token.atOrBeforeCaret = ( caretCharIndex <= endCharIndex );
		token.atOrAfterCaret = ( startCharIndex <= caretCharIndex );
		token.isActive = token.atOrBeforeCaret && token.atOrAfterCaret;
	}
};

TypingState.prototype.__compile = function( allTokens ) {
	var charIndex = 0;
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		token.text = token.isUser ? token.user : token.mt;
		token.charIndex = charIndex;
		charIndex += token.text.length + token.sep.length;
	}
	var allText = allTokens.map( function(d) { return d.text + d.sep } ).join( "" );
	return allText;
};

TypingState.prototype.__markMtExpired = function( allTokens, mtText ) {
	var termsAndSeps = mtText.split( this.WHITESPACE );
	var length = ( termsAndSeps.length + 1 ) / 2;
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var term = ( n < length ) ? termsAndSeps[ n * 2 ] : "";
		var isMt = ( n < length );
		token.mt = term;
		token.isMt = isMt;
		token.isExpired = true;
	}
};

TypingState.prototype.__markUserAccepted = function( allTokens, caretCharIndex ) {
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var startCharIndex = token.charIndex;
		var endCharIndex = startCharIndex + token.term.length;
		token.isAccepted = ( caretCharIndex <= endCharIndex );
	}
};

TypingState.prototype.__setCharIndexes = function( caretCharIndex, selectionCharIndex ) {
	this.setAttr( "caretCharIndex", caretCharIndex );
	if ( selectionCharIndex === caretCharIndex ) {
		this.setAttr( "selectionStartCharIndex", caretCharIndex );
		this.setAttr( "selectionEndCharIndex", caretCharIndex );
		this.setAttr( "selectionDirection", "none" );
	}
	else if ( selectionCharIndex < caretCharIndex ) {
		this.setAttr( "selectionStartCharIndex", selectionCharIndex );
		this.setAttr( "selectionEndCharIndex", caretCharIndex );
		this.setAttr( "selectionDirection", "forward" );
	}
	else {
		this.setAttr( "selectionStartCharIndex", caretCharIndex );
		this.setAttr( "selectionEndCharIndex", selectionCharIndex );
		this.setAttr( "selectionDirection", "backward" );
	}
};

/**
 * Update machine translation.
 * @param {string} userText Sentence prefix used in generating the machine translation.
 * @param {string} mtText Machine translation excluding the sentence prefix.
 **/
TypingState.prototype.updateTranslation = function( userText, mtText ) {
	this.__resetAllTokens( userText, mtText );
	this.flush();
	return this;
};

/**
 * Trigger an event to update translation.
 **/
TypingState.prototype.triggerUpdate = function() {
	this.trigger( "token" );
	console.log( "REFRESH", this.getUserText() );
	return this;
};

/**
 * Get user-entered text (i.e., sentencee prefix) for generating the machine translation.
 **/
TypingState.prototype.getUserText = function() {
	var allTokens = this.getAttr( "allTokens" );
	var userTokens = _.filter( allTokens, function(d) { return d.isUser } );
	var userText = userTokens.map( function(d) { return d.user + d.sep } ).join( "" );
	return userText;
};

/** @private **/
TypingState.prototype.WHITESPACE = /([ ]+)/g;

/**
 * Determine whether to update machine translation.
 * If so, mark all tokens as 'expired' and split all text into userText (sentence prefix) and mtText (to be updated).
 * Caret location is guaranteed to be within userText. If not, update the token texts and the active token accordingly.
 * @param {string} allText All content in the Typing UI including userText and mtText.
 * @param {number} caretCharIndex Location of the caret.
 * @param {number} selectionStartCharIndex Start location of the text selection.
 * @param {number} selectionEndCharIndex End location of the text selection.
 **/
TypingState.prototype.updateAllText = function( allText, caretCharIndex, selectionStartCharIndex, selectionEndCharIndex, forceExpire ) {
	if ( forceExpire === undefined ) { forceExpire = false }
	var isExpired = forceExpire || this.__isExpired( allText, caretCharIndex );
	if ( isExpired )
		this.__expireAllTokens( allText, caretCharIndex );
	else
		this.__updateAllTokens( allText, caretCharIndex );
	this.setAttr( "selectionStartCharIndex", selectionStartCharIndex );
	this.setAttr( "selectionEndCharIndex", selectionEndCharIndex );
	this.flush();
	if ( isExpired )
		this.triggerUpdate();
	return this;
};

/** @private **/
TypingState.prototype.__resetAllTokens = function( userText, mtText ) {
	var allTokens = [];
	var allText = "";
	var caretCharIndex = this.getAttr( "caretCharIndex" );
	
	var charIndex = 0;
	var hasActive = false;

	// This regular expression always yields an odd number of "userTermsAndSeps" values
	// The odd entries are terms (for a total of N+1 terms)
	// The even entries are separators (for a total of N separators)
	var userTermsAndSeps = userText.split( this.WHITESPACE );
	var userLength = ( userTermsAndSeps.length - 1 ) / 2;
	var mtTermsAndSeps = mtText.split( this.WHITESPACE );
	var mtLength = ( mtTermsAndSeps.length - 1 ) / 2;
	
	for ( var i = 0; i < userLength; i++ ) {
		var token = {};
		var term = userTermsAndSeps[ i * 2 ];
		var sep = userTermsAndSeps[ i * 2 + 1 ];
		token.startCharIndex = charIndex;
		charIndex += term.length;
		charIndex += sep.length;
		allText += term + sep;
		
		token.user = term;
		token.mt = term;
		token.sep = sep;
		token.suggestions = [];
		
		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isUser = true;
		token.isMtExpired = false;
		token.isMtCandidate = false;
		allTokens.push( token );
	}
	
	var token = {};
	var term = userTermsAndSeps[ userLength * 2 ];
	var sep = " ";
	token.startCharIndex = charIndex;
	charIndex += term.length;
	charIndex += sep.length;
	allText += term + sep;
	
	token.user = term;
	token.mt = mtTermsAndSeps[ 0 ];
	token.sep = sep;
	token.suggestions = [ token.mt ];

	var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
	var hasActive = hasActive || isActive;
	token.isActive = isActive;
	token.isUser = true;
	token.isMtExpired = false;
	token.isMtCandidate = false;
	allTokens.push( token );
	
	for ( var i = 0; i < mtLength; i++ ) {
		var token = {};
		var term = mtTermsAndSeps[ (i+1) * 2 ];
		var sep = ( i === mtLength-1 ) ? "" : " ";
		token.startCharIndex = charIndex;
		charIndex += term.length;
		charIndex += sep.length;
		allText += term + sep;
		
		token.user = "";
		token.mt = term;
		token.sep = sep;
		token.suggestions = [];

		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isUser = false;
		token.isMtExpired = false;
		token.isMtCandidate = !hasActive;
		allTokens.push( token );
	}
	
	this.setAttr( "allTokens", allTokens );
	this.setAttr( "allText", allText );
	this.setAttr( "userText", userText );
	this.setAttr( "mtText", mtText );
};

/** @private **/
TypingState.prototype.__updateAllTokens = function( allText, caretCharIndex ) {
	var allTokens = this.getAttr( "allTokens" );
	
	// This regular expression always yields an odd number of "userTermsAndSeps" values
	// The odd entries are terms (for a total of N terms)
	// The even entries are separators (for a total of N-1 separators)
	var allTermsAndSeps = allText.split( this.WHITESPACE );
	var allLength = ( allTermsAndSeps.length + 1 ) / 2;
	chai.assert.equal( allLength, allTokens.length, "Number of tokens must remain constant between updates." );
	
	var charIndex = 0;
	var hasActive = false;
	allText = "";
	for ( var i = 0; i < allLength; i++ ) {
		var token = allTokens[ i ];
		var term = allTermsAndSeps[ i * 2 ];
		var sep = ( i === allLength-1 ) ? "" : allTermsAndSeps[ i * 2 + 1 ];
		token.startCharIndex = charIndex;
		charIndex += term.length;
		charIndex += sep.length;
		allText += term + sep;
		
		if ( token.isUser )
			token.user = term;
		else
			token.mt = term;
		
		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isMtCandidate = !hasActive;
	}
	
	this.setAttr( "allTokens", allTokens );
	this.setAttr( "allText", allText );
	this.setAttr( "caretCharIndex", caretCharIndex );
};

/** @private **/
TypingState.prototype.__expireAllTokens = function( allText, caretCharIndex ) {
	var allTokens = [];
	
	// This regular expression always yields an odd number of "userTermsAndSeps" values
	// The odd entries are terms (for a total of N terms)
	// The even entries are separators (for a total of N-1 separators)
	var allTermsAndSeps = allText.split( this.WHITESPACE );
	var allLength = ( allTermsAndSeps.length + 1 ) / 2;
	
	var charIndex = 0;
	var hasActive = false;
	allText = "";
	for ( var i = 0; i < allLength; i++ ) {
		var token = {};
		var term = allTermsAndSeps[ i * 2 ];
		var sep = ( i === allLength-1 ) ? "" : allTermsAndSeps[ i * 2 + 1 ];
		token.startCharIndex = charIndex;
		charIndex += term.length;
		charIndex += sep.length;
		allText += term + sep;
		
		token.user = "";
		token.mt = "";
		token.sep = sep;
		token.suggestions = [];
		
		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isUser = !hasActive || isActive;
		token.isMtExpired = true;
		token.isMtCandidate = false;
		
		if ( token.isUser )
			token.user = term;
		else
			token.mt = term;
		
		allTokens.push( token );
	}
	
	this.setAttr( "allTokens", allTokens );
	this.setAttr( "allText", allText );
	this.setAttr( "caretCharIndex", caretCharIndex );
};

/** @private **/
TypingState.prototype.__isExpired = function( newText, caretCharIndex ) {
	var originalText = this.getAttr( "originalText" );
	if ( originalText === newText ) {
		return false;
	}
	else {
		var results = this.__getAddedRemovedText( originalText, newText );
		var removedText = results.removedText;
		var addedText = results.addedText;
		
		var allTokens = this.getAttr( "allTokens" );
		var newTermsAndSeps = newText.split( this.WHITESPACE );
		var newLength = ( newTermsAndSeps.length + 1 ) / 2;
		var expireOnChangeNumTokens = ( allTokens.length !== newLength );
		if ( expireOnChangeNumTokens ) {
			return true;
		}
		
		// Expire if changed text includes a whitespace
		var expireOnChangedWhitespace = this.WHITESPACE.test( removedText ) || this.WHITESPACE.test( addedText );
		if ( expireOnChangedWhitespace ) {
			return true;
		}

		// Expire if the character immediately in front of the caret is a whitespace
//		var expireOnPreceedingWhitespace = ( caretCharIndex === 0 || this.WHITESPACE.test( newText.substr( caretCharIndex - 1, 1 ) ) );
//		if ( expireOnPreceedingWhitespace ) {
//			return true;
//		}
		// Expire if caret moves out of changed region
		var addedStartCharIndex = results.addedStartCharIndex;
		var addedEndCharIndex = results.addedEndCharIndex;
		if ( ! ( addedStartCharIndex <= caretCharIndex  &&  caretCharIndex <= addedEndCharIndex ) ) {
			return true;
		}
		// Otherwise, allow the user to continue editing
		return false;
	}
};

/** @private **/
TypingState.prototype.__getAddedRemovedText = function( prevText, newText ) {
	var removedStartCharIndex = 0;
	var removedEndCharIndex = prevText.length;
	var addedStartCharIndex = 0;
	var addedEndCharIndex = newText.length;
	
	var iMax = Math.min( prevText.length, newText.length );
	for ( var i = 0; i < iMax; i++ ) {
		if ( prevText.charCodeAt(i) !== newText.charCodeAt(i) ) {
			removedStartCharIndex = i;
			addedStartCharIndex = i;
			break;
		}
	}
	for ( var i = 0; i < iMax; i++ ) {
		if ( prevText.charCodeAt(prevText.length-i-1) !== newText.charCodeAt(newText.length-i-1) ) {
			removedEndCharIndex = prevText.length - i;
			addedEndCharIndex = newText.length - i;
			break;
		}
	}
	results = {
		"removedStartCharIndex" : removedStartCharIndex,
		"removedEndCharIndex" : removedEndCharIndex,
		"addedStartCharIndex" : addedStartCharIndex,
		"addedEndCharIndex" : addedEndCharIndex,
		"removedText" : prevText.substring( removedStartCharIndex, removedEndCharIndex ),
		"addedText" : newText.substring( addedStartCharIndex, addedEndCharIndex )
	};
	return results;
};
