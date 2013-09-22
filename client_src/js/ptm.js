// Deployment options
// console.log = function() {};

var PTM = function() {};

PTM.prototype.run = function() {
	this.typingState = new TypingState();
	this.typingModel = new TypingModel( { "state" : this.typingState } );
	this.typingUI = new TypingUI( { "model" : this.typingModel } );
	this.server = new TranslateServer();
  
	this.sourceBox = new SourceBox( "data/en-source.ann.json", this.initTranslation.bind(this) , this.server.wordQuery.bind(this.server));
	this.sourceBox.render( "source" );
  
	this.typingState.on( "syncTranslation", this.updateTranslation.bind(this) );
};

/**
 * Initialize TypingUI.
 **/
PTM.prototype.initTranslation = function() {
	var handler = function( translations ) { this.typingState.updateTranslation( translations === null ? "" : translations[0] ) };
	var sourceText = this.sourceBox.getSourceText();
	this.server.translate( sourceText, "", handler.bind(this) );
};

/**
 * Update TypingUI.
 * @param {Object} syncKey An arbitrary identifier that is unique for each request. Pass back to TypingUI to ensure synchronization.
 **/
PTM.prototype.updateTranslation = function( syncKey ) {
	var handler = function( translations ) { this.typingState.syncTranslation( syncKey, translations === null ? "" : translations[0] ) };
	var sourceText = this.sourceBox.getSourceText();
	var targetPrefix = this.typingState.getUserText();
	this.server.translate( sourceText, targetPrefix, handler.bind(this) );
};
