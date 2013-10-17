var TargetBoxView = Backbone.View.extend({
	el : ".TargetBoxView"
});

TargetBoxView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" );
};
