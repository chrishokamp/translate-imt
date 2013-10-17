var TargetBoxState = Backbone.Model.extend({
	defaults : {
		// Initialized once by PTM...
		"segmentId" : null,
		
		// States based on user inputs...
		"userText" : "",
		"caretIndex" : 0,
		
		// States based on machine translations...
		"prefix" : "",          // @value {string} Prefix used to generate the translations.
		"translationList" : [], // @value {string[][]} A list of translations. For each translation: a list of tokens represented as a string.
		"alignIndexList" : [],  // @value {Object[][]} For each translation: a list of objects {sourceIndex: number, targetIndex: number}.
		"chunkIndexList" : [],  // @value {integer[][]} For each translation: a list of chunk indexes.

		// Global states
		"hasFocus" : false,
		
		// Derived states
		"showBestTranslation" : true, // @value {boolean} True if userText is empty or if this target box's textarea has input focus.
		"showSuggestions" : true,     // @value {boolean} True if caret is at the end of this target box's text area.
	}
});

TargetBoxState.prototype.WHITESPACE = /[ ]+/g;

TargetBoxState.prototype.initialize = function() {
	this.updateMatchingTokens = _.debounce( this.__updateMatchingTokens, 10 );
	this.updateShowBestTranslations = _.debounce( this.__updateShowBestTranslations, 10 );
	this.updateShowSuggestions = _.debounce( this.__updateShowSuggestions, 10 );
	this.on( "change:prefix", this.updatePrefixTokens );
	this.on( "change:userText", this.comparePrefixTokens );
	this.on( "change:userText change:alignIndexList", this.updateMatchingTokens );
	this.on( "change:userText change:hasFocus", this.updateShowBestTranslations );
	this.on( "change:userText change:caretIndex", this.updateShowSuggestions );
};

TargetBoxState.prototype.updatePrefixTokens = function() {
	var prefix = this.get( "prefix" );
	var prefixTokens = prefix.split( this.WHITESPACE );
	this.__prefixTokens = prefixTokens;
	this.__isExpired = false;
};

TargetBoxState.prototype.comparePrefixTokens = function() {
	var userText = this.get( "userText" );
	var userTokens = userText.split( this.WHITESPACE );
	var prefixTokens = ( this.__prefixTokens || [] );
	var isExpired = ( this.__isExpired === true );
	if ( ! isExpired ) {
		if ( userTokens.length !== prefixTokens.length ) {
			isExpried = true;
		}
		else {
			for ( var i = 0; i < userTokens.length - 1; i ++ ) {
				if ( userTokens[i] !== prefixTokens[i] ) {
					isExpired = true;
					break;
				}
			}
		}
		if ( isExpired ) {
			var segmentId = this.get( "segmentId" );
			this.trigger( "updateTranslations", segmentId, userText );
		}
	}
	this.__isExpired = isExpired;
};

TargetBoxState.prototype.__updateMatchingTokens = function() {
	var matchingTokens = {};
	var alignIndexList = this.get( "alignIndexList" );
	if ( alignIndexList.length > 0 ) {
		var bestAlignIndexes = alignIndexList[0];
		var userText = this.get( "userText" );
		var userTokens = userText.split( this.WHITESPACE );
		for ( var a = 0; a < bestAlignIndexes.length; a++ ) {
			var alignment = bestAlignIndexes[a];
			var sourceIndex = alignment.sourceIndex;
			var targetIndex = alignment.targetIndex;
			if ( targetIndex < userTokens.length - 1 ) {
				matchingTokens[ sourceIndex ] = true;
			}
		}
	}
	var segmentId = this.get( "segmentId" );
	this.trigger( "updateMatchingTokens", segmentId, matchingTokens );
};

TargetBoxState.prototype.__updateShowBestTranslations = function() {
	var hasFocus = this.get( "hasFocus" );
	var userText = this.get( "userText" );
	var showBestTranslations = ( hasFocus || userText.length === 0 );
	this.set( "showBestTranslations", showBestTranslations );
};

TargetBoxState.prototype.__updateShowSuggestions = function() {
	var caretIndex = this.get( "caretIndex" );
	var userText = this.get( "userText" );
	var showSuggestions = ( caretIndex === userText.length );
	this.set( "showSuggestions", showSuggestions );
};

