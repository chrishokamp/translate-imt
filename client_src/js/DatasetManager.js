var DatasetManager = Backbone.Model.extend({
	defaults : {
		"datasetURL" : null,
		"datasets" : []
	},
	url : "data/index.json"
});

DatasetManager.prototype.initialize = function() {
	this.qs = new QueryString();
	this.qs.addValueParameter( "url", "url" );
	this.view = new DatasetManagerUI({ "model" : this });
	this.on( "change:datasets", this.view.render, this.view );
	this.on( "change:datasetURL", this.saveQueryString );
	this.fetch({ "success" : this.loadQueryString.bind(this) });
};

DatasetManager.prototype.saveQueryString = function() {
	var datasetURL = this.get( "datasetURL" );
	var states = { "url" : datasetURL }
	if ( datasetURL !== null ) {
		this.qs.write(states);
	}
};

DatasetManager.prototype.loadQueryString = function() {
	var states = this.qs.read();
	var datasetURL = states["url"];
	if ( datasetURL === null ) {
		datasetURL = this.get( "datasets" )[0].url;
	}
	this.set( "datasetURL", datasetURL );
};

var DatasetManagerUI = Backbone.View.extend({
	el : "#DatasetManager"
});

DatasetManagerUI.prototype.initialize = function() {
	this.view = d3.select( this.el );
	this.view.on( "change", function() { this.model.set( "datasetURL", this.view[0][0].value ) }.bind(this) );
};

DatasetManagerUI.prototype.render = function() {
	var datasetURL = this.model.get( "datasetURL" );
	var datasetIndex = null;
	
	var datasets = this.model.get( "datasets" );
	var elems = this.view.selectAll( "option" ).data( datasets );
	elems.enter().append( "option" );
	elems.exit().remove();
	this.view.selectAll( "option" )
		.attr( "value", function(d) { return d.url } )
		.attr( "selected", function(d) { return ( d.value === datasetURL ) ? "selected" : null } )
		.text( function(d) { return d.label } );
};
