var TargetView = Backbone.View.extend({
	el : ".TargetView"
});

TargetView.prototype.initialize = function( options ) {
	this.listenTo( this.model, "modified", this.render );
};

TargetView.prototype.render = function() {
	
};
