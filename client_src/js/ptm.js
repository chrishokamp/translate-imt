// Deployment options
// console.log = function() {};

var PTM = function() {};

PTM.prototype.run = function() {
	this.sourceBox = new SourceBox( "data/en-source.js", this.initTranslation.bind(this) );
	this.sourceBox.render( "source" );
	this.typingState = new TypingState();
	this.typingModel = new TypingModel( { "state" : this.typingState } );
	this.typingUI = new TypingUI( { "model" : this.typingModel } );
	this.server = new TranslateServer();
	this.server.SERVER_URL = "http://localhost:8888/cgi-bin/redirect.py"
	this.typingState.on( "syncTranslation", this.updateTranslation.bind(this) );
};

/**
 * Initialize TypingUI.
 **/
PTM.prototype.initTranslation = function() {
	var handler = function( translation ) { this.typingState.updateTranslation( translation ) };
	var sourceText = this.sourceBox.getSourceText();
	this.server.translate( handler.bind(this), sourceText );
};

/**
 * Update TypingUI.
 * @param {Object} syncKey An arbitrary identifier that is unique for each request. Pass back to TypingUI to ensure synchronization.
 **/
PTM.prototype.updateTranslation = function( syncKey ) {
	var handler = function( translation ) { this.typingState.syncTranslation( syncKey, translation ) };
	var sourceText = this.sourceBox.getSourceText();
	var targetPrefix = this.typingState.getUserText();
	this.server.translate( handler.bind(this), sourceText, targetPrefix );
};
