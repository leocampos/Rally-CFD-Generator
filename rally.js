var Abril = (typeof Abril == 'undefined') ? {} : Abril;

Abril.Rally = function(component) {
	this.component = component;
	this.component.setHost(this);
	this.dataSource = null;
	var that = this;
	this.pluginsByEvent = {};
	this.hooks = [
		['onDataReady', 'Usado para tratar os dados carregados. Recebe array de arrays, sendo a 1a linha o cabecalho']
	];
	
	this.addPlugin = function(eventName, func) {
		if(typeof that.pluginsByEvent[eventName] == 'undefined')
			that.pluginsByEvent[eventName] = [];
			
		that.pluginsByEvent[eventName].push(func);
	}
	
	this.fireEvent = function(eventName, args) {
		if(typeof that.pluginsByEvent[eventName] == 'undefined')
			return;
		
		that.pluginsByEvent[eventName].each(function(func){
			if(typeof func != 'function')
				return;
				
			try {
				func(args);
			} catch(e) {
				alert(e.message);
			}	
		});
	}
	
	this.onError = function(response){
	   this.errors = response.Errors;
	   this.warnings = response.Warnings;
	}

	this.start = function() {
		this.dataSource = component.getDataSource();
		this.dataSource.findAll(component.getQuery(), component.onComplete, this.onError);
	}
	
	this.drawChart = function(rawData) {
		that.fireEvent('onDataReady', rawData);
	}
}

Abril.Rally.GROOMING = 1;
Abril.Rally.DEFINED = 2;
Abril.Rally.IN_PROGRESS = 3;
Abril.Rally.COMPLETED = 4;
Abril.Rally.ACCEPTED = 5;
Abril.Rally.RELEASED = 6;
Abril.Rally.STATE_TABLE_POSITION = {"Grooming": Abril.Rally.GROOMING,"Defined": Abril.Rally.DEFINED,"In-Progress": Abril.Rally.IN_PROGRESS, "Completed": Abril.Rally.COMPLETED,"Accepted": Abril.Rally.ACCEPTED,"Released": Abril.Rally.RELEASED};

Abril.Rally.Release = function(releaseID) {
	this.releaseID = releaseID;
	this.name = 'ReleaseComponent';
	this.host = null;
	var that = this;
	
	this.getDataSource = function() {
		return new rally.sdk.data.RallyDataSource("1980703928");
	}
	
	this.getQuery = function() {
		return {'key': 'cumulative','type': 'releasecumulativeflowdata','query': '(ReleaseObjectID = ' + this.releaseID + ')','fetch': true};
	}
	
	this.setHost = function(host) {
		this.host = host;
	}
	
	this.onComplete = function(dados) {
		var cumulativeFlowItems = dados['cumulative'];
	    var actualDate = null;
	    var newDate = null;
	    var actualItem = null;
	    var actualRow = null;
		var rawData = [];
		
		for(var i=0; i < cumulativeFlowItems.length; i++) {
			actualItem = cumulativeFlowItems[i];
			newDate = actualItem.CreationDate;

			if(actualDate != newDate) {
				actualDate = newDate;
				var date = new Date(newDate);
				actualRow = [date.getDate() + "/" + date.getMonth(),0,0,0,0,0,0];
				rawData.push(actualRow);
			}

			actualRow[Abril.Rally.STATE_TABLE_POSITION[actualItem.CardState]] = actualItem.CardEstimateTotal;
		}

		if(that.host)
			that.host.drawChart(rawData);
	}
}

Abril.Rally.ByQuery = function(query) {
	this.query = {'key': 'stories','type': 'hierarchicalrequirement','query': query,'fetch': true}
	this.name = 'ByQueryComponent';
	this.host = null;
	this.dataSource = null;
	this.stories = [];
	this.toBeLoaded = 0;
	this.anyStoryToBeLoaded = false;
	this.revisionToBeLoaded = 0;
	this.anyRevisionToBeLoaded = false;
	
	var storiesByRevisionRef = {};
	
	var that = this;
	
	this.getDataSource = function() {
		that.dataSource = new rally.sdk.data.RallyDataSource("1980703928");
		return that.dataSource;
	}
	this.getQuery = function() {return that.query;}
	this.setHost = function(host) {this.host = host;}
	this.extractDataFromRevision = function(revision) {
		var description = revision;

		if(matched = description.match(/PLAN ESTIMATE changed from \[\d+\.\d+ Points\] to \[(\d+\.\d+) Points\].*/))
	  		return {'what': 'planEstimate', 'newValue': (matched[1] * 1)};
		else if (matched = description.match(/SCHEDULE STATE changed from \[[a-zA-Z-]+\] to \[([a-zA-Z-]+)\].*/))
	  		return {'what': 'scheduleState', 'newValue': matched[1]};
		else if (matched = description.match(/PLAN ESTIMATE added \[(\d+\.\d+) Points\].*/))
	  		return {'what': 'planEstimate', 'newValue': (matched[1] * 1)};
		else if (matched = description.match(/PLAN ESTIMATE removed \[(\d+\.\d+) Points\].*/))
	  		return {'what': 'planEstimate', 'newValue': 0};

		throw 'Unmatched Revision: ' + description;
	}
	
	this.loadStory = function(story) {
		that.dataSource.getRallyObject(story._ref, that.onStoryLoad, that.host.onError)
	}
	
	this.loadRevisionHistory = function(story) {
		storiesByRevisionRef[story.RevisionHistory._ref] = story;
		
		that.dataSource.getRallyObject(story.RevisionHistory._ref, that.onRevisionLoad, that.host.onError)
	}
	
	this.onStoryLoad = function(story) {
		that.toBeLoaded--;
		that.storeOnlyNodes(story);
		
		that.tryStoriesLoaded();
	}
	
	this.onRevisionLoad = function(revision) {
		that.revisionToBeLoaded--;
		storiesByRevisionRef[revision._ref].RevisionHistory = revision;
		
		that.tryStoriesLoaded();
	}
	
	this.tryStoriesLoaded = function() {
		if(that.anyStoryToBeLoaded && that.toBeLoaded == 0 && that.anyRevisionToBeLoaded && that.revisionToBeLoaded == 0) {
			that.onStoriesLoaded();
		}
	}
	
	this.storeOnlyNodes = function(actualStory) {
		if(actualStory.Children.length == 0) {
			that.revisionToBeLoaded++;
			that.anyRevisionToBeLoaded = true;
			that.loadRevisionHistory(actualStory);
			that.stories.push(actualStory);
		} else {
			actualStory.Children.each(function(story) {
				that.anyStoryToBeLoaded = true;
				that.toBeLoaded++;
				that.loadStory(story);
			});
		}
		
		that.tryStoriesLoaded();
	}
	
	/**
	 * Casa revisão tem uma descrição com várias alterações. As que interessam para
	 * a montagem de um CFD são as de PLAN ESTIMATE e as de SCHEDULE STATE
	*/
	var filterRevisions = function(revisions) {
		if(!revisions || revisions.length == 0) return [];
		
		var filteredItems = [];
		var description = null;
	    var itens = null;
		
		revisions.each(function(revision){
			description = revision.Description;
			itens = description.split(',');
			
			itens.each(function(descriptionPart) {
		      if(descriptionPart.match(/PLAN ESTIMATE.+/) || descriptionPart.match(/SCHEDULE STATE./))
		        filteredItems.push({'CreationDate': revision.CreationDate, 'Description': descriptionPart})
		    });
		});
    
	    return filteredItems;
	}
	
	this.onStoriesLoaded = function() {
		var dataByDateAndStage = {};
		var rawData = [];
		
		that.stories.each(function(story, index) {
			var REVISIONS_BY_DATE = {};
			var revisionHistory = story.RevisionHistory;
		  	var revisions = filterRevisions(revisionHistory.Revisions);
			
			//POPULATE REVISIONS_BY_DATE
			revisions.each(function(revision) {
				var key = new Date(revision.CreationDate).midnight();

				if(REVISIONS_BY_DATE[key])
					REVISIONS_BY_DATE[key].push(revision.Description)
				else
					REVISIONS_BY_DATE[key] = [revision.Description];
			});
    
			var planEstimate = story.PlanEstimate;
			var scheduleState = story.ScheduleState;
			var lastUpdateDate = new Date(story.LastUpdateDate).midnight();
			var createDate = new Date(story.CreationDate).midnight();
  
			Abril.TODAY.downTo(createDate, function(data) {
			if(lastUpdateDate >= data) {
				var revisions = REVISIONS_BY_DATE[data];

				if(revisions) {
					revisions.each(function(item, index){
						parsedRevision = that.extractDataFromRevision(item);
						newValue = parsedRevision.newValue
						eval(parsedRevision.what + '=' + (typeof newValue == 'string' ? '"' + newValue + '"' : newValue));
					});
				}
			}
    
		    var dateStageKey = data.toBr() + '_' + scheduleState;
		    var linha = dataByDateAndStage[dateStageKey];
		    var columnIndex = Abril.Rally.STATE_TABLE_POSITION[scheduleState];
		
		    if(!linha) {
		      linha = [data.toBr(), 0, 0, 0, 0, 0, 0];
      
		      dataByDateAndStage[dateStageKey] = linha;
		    }
    
		    linha[columnIndex] += planEstimate;
		  });
		});

		var firstDay = new Date(2012,5,26);

		firstDay.upTo(Abril.TODAY, function(data) {
		  var linha = [data.toExcel(),0,0,0,0,0,0];
  
		  ['Grooming', 'Defined', 'In-Progress', 'Completed', 'Accepted', 'Released'].each(function(scheduleState, index) {
		    var dateStageKey = data.toBr() + '_' + scheduleState;
		    var stateLine = dataByDateAndStage[dateStageKey];
    
		    if(stateLine)
		      linha[index + 1] = stateLine[index + 1];
		  });
  
		  rawData.push(linha);
		});
		
		
		if(that.host)
			that.host.drawChart(rawData);
	}
	
	this.onComplete = function(dados) {
		dados['stories'].each(that.storeOnlyNodes);
	}
}

Abril.Rally.Plugins = {
	doGetDate: function() {
		return Abril.TODAY;
	},
	doGetTableDivId: function() {
		return 'table_div';
	},
	doGetChartOptions: function() {
		return {
			title: 'Cumulative Flow Data',
			colors: ['#000000','#FF0000','#264CA9','#4DC100','#6D27BD','#762517'],
			height: 500,
			vAxis: {title: 'Sum Estimate', titleTextStyle: {color: '#000000'}},
			hAxis: {title: 'Date', titleTextStyle: {color: '#000000'}}
		};
	},
	doGetChartDivId: function() {
		return 'chart_div';
	},
	CumulativePlugin: function(rawData) {
		rawData.each(function(linha) {
			linha[Abril.Rally.ACCEPTED] += linha[Abril.Rally.RELEASED];
    		linha[Abril.Rally.COMPLETED] += linha[Abril.Rally.ACCEPTED];
    		linha[Abril.Rally.IN_PROGRESS] += linha[Abril.Rally.COMPLETED];
    		linha[Abril.Rally.DEFINED] += linha[Abril.Rally.IN_PROGRESS];
    		linha[Abril.Rally.GROOMING] += linha[Abril.Rally.DEFINED];
		});
	},
	UntilDateAndTrendPlugin: function(rawData) {
		var limitDay = Abril.Rally.Plugins.doGetDate();
		
		var tomorow = Abril.TODAY.nextWorkingDay();
		var toLimitDayInformation = [];
		var topLine = rawData.last();
		var firstLine = rawData[1];
		
		var escopo = topLine ? topLine[Abril.Rally.GROOMING] : 0;
		var definido = topLine ? topLine[Abril.Rally.DEFINED] : 0;
		var emProgresso = topLine ? topLine[Abril.Rally.IN_PROGRESS] : 0;
		var completo = topLine ? topLine[Abril.Rally.COMPLETED] : 0;
		var aceito = topLine ? topLine[Abril.Rally.ACCEPTED] : 0;
		var lancado = topLine ? topLine[Abril.Rally.RELEASED] : 0;
		
		var emProgressoInicial = firstLine ? firstLine[Abril.Rally.IN_PROGRESS] : 0;
		var completoInicial = firstLine ? firstLine[Abril.Rally.COMPLETED] : 0;
		var aceitoInicial = firstLine ? firstLine[Abril.Rally.ACCEPTED] : 0;
		var lancadoInicial = firstLine ? firstLine[Abril.Rally.RELEASED] : 0;
		
		var avgAccepted = (aceito - aceitoInicial) / rawData.length;
		var avgInProgress = (emProgresso - emProgressoInicial) / rawData.length;
		var avgReleased = (lancado - lancadoInicial) / rawData.length;
		var avgCompleted = (completo - completoInicial) / rawData.length;
		
		rawData.each(function(linha, index){
			linha.splice(Abril.Rally.ACCEPTED+1,0,true);
			linha.splice(Abril.Rally.COMPLETED+1,0,true);
			linha.splice(Abril.Rally.IN_PROGRESS+1,0,true);
			linha.push(true);
		});
		
		tomorow.upTo(limitDay, function(date) {
			emProgresso += avgInProgress;
			completo += avgCompleted;
			aceito += avgAccepted;
			lancado += avgReleased;
			
			rawData.push([date.toExcel(), escopo, definido, emProgresso, false, completo, false, aceito, false, lancado, false]);
		})
	},
	DrawTablePlugin: function(rawData) {
		var chartDiv = jQuery('#' + Abril.Rally.Plugins.doGetTableDivId());

		var tableHTML = "<table border=1><tr><td>Date</td><td>Escopo</td><td>Analise Completa</td><td>Em Desenvolvimento</td><td>IN_PROGRESS Certainty</td><td>QA Completo</td><td>COMPLETED Certainty</td><td>Aceito</td><td>ACCEPTED Certainty</td><td>Released</td><td>RELEASED Certainty</td></tr>";

		for(var i = 0; i < rawData.length; i++) {
  			row = rawData[i];

  			tableHTML += "<tr>"

  			for(var j = 0; j < row.length; j++) {
    			tableHTML += "<td>" + row[j] + "</td>";
  			}

  			tableHTML += "</tr>";
		}

		tableHTML += "</table>";
		chartDiv.html(tableHTML);
	},
	DrawChartPlugin: function(rawData) {
		var data = new google.visualization.DataTable();
		data.addColumn('string', 'Data');
		data.addColumn('number', 'Escopo');
		data.addColumn('number', 'Analise Completa');
		data.addColumn('number', 'Em Desenvolvimento');
		data.addColumn({type:'boolean',role:'certainty'});
		data.addColumn('number', 'QA Completo');
		data.addColumn({type:'boolean',role:'certainty'});
		data.addColumn('number', 'Aceito');
		data.addColumn({type:'boolean',role:'certainty'});
		data.addColumn('number', 'Released');
		data.addColumn({type:'boolean',role:'certainty'});

		data.addRows(rawData.slice(1, rawData.length));

		var options = Abril.Rally.Plugins.doGetChartOptions();

		var chart = new google.visualization.LineChart(document.getElementById(Abril.Rally.Plugins.doGetChartDivId()));
		chart.draw(data, options);
	}
}
