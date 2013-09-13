var TypingState = Backbone.Model.extend({
	"defaults" : {
		"allText" : "",
		"allTokens" : "",
		"userText" : "",
		"mtText" : "",
		"caretCharIndex" : 0,
		"selectionStartCharIndex" : 0,
		"selectionEndCharIndex" : 0
	}
});

/**
 * User-entered text (i.e., prefix) and caret index (i.e., within user-entered text)
 * should already be set prior to sending a MT server request
 **/
TypingState.prototype.updateMtText = function( userText, mtText ) {
	this.__resetAllTokens( userText, mtText );
};

/**
 * Split allText into userText and mtText
 * and satisfy constraint ( caretCharIndex <= userText.length )
 **/
TypingState.prototype.updateAllText = function( allText, caretCharIndex, selectionStartCharIndex, selectionEndCharIndex ) {
	if ( this.__isExpired( allText, caretCharIndex ) )
		this.__expireAllTokens( allText, caretCharIndex );
	else
		this.__updateAllTokens( allText, caretCharIndex );
	this.setAttr( "selectionStartCharIndex", selectionStartCharIndex );
	this.setAttr( "selectionEndCharIndex", selectionEndCharIndex );
};

TypingState.prototype.triggerUpdate = function() {
	this.trigger( "token" );
};

TypingState.prototype.getUserText = function() {
	var allTokens = this.getAttr( "allTokens" );
	var userTokens = _.filter( allTokens, function(d) { return d.isUser } );
	var userText = userTokens.map( function(d) { return d.user + d.sep } ).join( "" );
	return userText;
};

/** @private **/
TypingState.prototype.WHITESPACE = /([ ]+)/g;

/** @private **/
TypingState.prototype.__resetAllTokens = function( userText, mtText ) {
	var allTokens = [];
	var allText = "";
	var caretCharInex = this.getAttr( "caretCharIndex" );
	
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
		token.endCharIndex = charIndex;
		charIndex += sep.length;
		allText += term + sep;
		
		token.user = term;
		token.mt = term;
		token.sep = sep;
		
		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isUser = true;
		token.isMt = false;
		token.isMtExpired = false;
		token.isMtCandidate = false;
		allTokens.push( token );
	}
	
	var token = {};
	var term = userTermsAndSeps[ userLength * 2 ];
	var sep = " ";
	token.startCharIndex = charIndex;
	charIndex += term.length;
	token.endCharIndex = charIndex;
	charIndex += sep.length;
	allText += term + sep;
	
	token.user = term;
	token.mt = mtTermsAndSeps[ 0 ];
	token.sep = sep;

	var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
	var hasActive = hasActive || isActive;
	token.isActive = isActive;
	token.isUser = true;
	token.isMt = false;
	token.isMtExpired = false;
	token.isMtCandidate = false;
	allTokens.push( token );
	
	for ( var i = 0; i < mtLength; i++ ) {
		var token = {};
		var term = mtTermsAndSeps[ (i+1) * 2 ];
		var sep = " ";
		token.startCharIndex = charIndex;
		charIndex += term.length;
		token.endCharIndex = charIndex;
		charIndex += sep.length;
		allText += term + sep;
		
		token.user = "";
		token.mt = term;
		token.sep = sep;

		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isUser = false;
		token.isMt = true;
		token.isMtExpired = false;
		token.isMtCandidate = hasActive;
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
	// The odd entries are terms (for a total of N+1 terms)
	// The even entries are separators (for a total of N separators)
	// However, by ending on a whitespace, the last entry of allText is always empty and thus should be ignored
	var allTermsAndSeps = ( allText + " " ).split( this.WHITESPACE );
	var allLength = ( allTermsAndSeps.length - 1 ) / 2;
	chia.assert.equal( allLength, allTokens.length, "Number of tokens must remain constant between updates." );
	
	var charIndex = 0;
	var hasActive = false;
	allText = "";
	for ( var i = 0; i < allLength; i++ ) {
		var token = allTokens[ i ];
		var term = allTermsAndSeps[ i * 2 ];
		var sep = allTermsAndSeps[ i * 2 + 1 ];
		token.startCharIndex = charIndex;
		charIndex += term.length;
		token.endCharIndex = charIndex;
		charIndex += sep.length;
		allText += term + sep;
		
		if ( token.isUser )
			token.user = term;
		else
			token.mt = term;
		
		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isMtCandidate = hasActive;
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
	// However, by ending on a whitespace, the last entry of allText is always empty and thus should be ignored
	var allTermsAndSeps = ( allText + " " ).split( this.WHITESPACE );
	var allLength = ( allTermsAndSeps.length + 1 ) / 2;
	
	var charIndex = 0;
	var hasActive = false;
	allText = "";
	for ( var i = 0; i < allLength; i++ ) {
		var token = {};
		var term = allTermsAndSeps[ i * 2 ];
		var sep = allTermsAndSeps[ i * 2 + 1 ];
		token.startCharIndex = charIndex;
		charIndex += term.length;
		token.endCharIndex = charIndex;
		charIndex += sep.length;
		allText += term + sep;
		
		token.user = "";
		token.mt = "";
		token.sep = sep;
		
		var isActive = ( caretCharIndex < charIndex ) && ! hasActive;
		var hasActive = hasActive || isActive;
		token.isActive = isActive;
		token.isUser = hasActive;
		token.isMt = ! hasActive;
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
	var allText = this.getAttr( "allText" );
	if ( allText === newText ) {
		return false;
	}
	else {
		var results = this.__getAddedRemovedText( allText, newText );
		var removedText = results.removedText;
		var addedText = results.addedText;
		// Expire if changed text includes a whitespace
		if ( this.WHITESPACE.test( removedText ) || this.WHITESPACE.test( addedText ) ) {
			return true;
		}
		// Expire if the character immediately in front of the caret is a whitespace
		if ( caretCharIndex === 0 || this.WHITESPACE.test( allText.substr( caretCharIndex - 1, 1 ) ) ) {
			return true;
		}
		// Expire if caret moves out of changed region
		var addedStartCharIndex = results.addedStartCharIndex;
		var addedEndCharIndex = results.addedEndCharIndex;
		if ( ! ( addedStartCharIndex <= caretCharIndex  &&  caretCharIndex <= addedEndCharIndex ) )
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
	for ( var i = 0; i < iMax; i++ ) {
		if ( prevText.charCodeAt(i) !== newText.charCodeAt(i) ) {
			removedStartCharIndex = i;
			addedStartCharIndex = i;
			break;
		}
	}
	for ( var i = 0; i < iMax; i++ ) {
		if ( prevText.charCodeAt(prevText.length-i-1) !== newText.charCodeAt(newText.length-i-1) ) {
			removedStartCharIndex = prevText.length - i;
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
