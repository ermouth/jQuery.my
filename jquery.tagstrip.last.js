(function( $ ){
	
	var tagIndByVal = function (tags, val) {
		var ind=null;
		tags.each(function(index){
			$o=this;
			if (($o.data("value")||$o.html) == val && ind===null) ind=index;
		});
		return ind;
	}

	var methods = {
		init: function (data) {
			var obj = $(this);
			var active = -1;
			var d = $.extend(true, {
				mode:"one", 
					//any -- any value, clicking tag inserts the value, tag is not activated
					//many -- multiselect
					//one -- choose only one
				tag:".tag",
				active:".active",
				label:".label",
				vars:".variants",
				value:"input.value",
				event:"change",
				data:null,
				generator: function (data, template) {
					return (template || '<span class="tag pseudolink" data-value="{value}">{name}</span> ').assign(data);
				},
				template:""
			}, data||{});
			
			
			//here should be prerequisites check!!!!!
			// -- if we already have tagstrip, call reinit with new val
			
			
			var $val = obj.find(d.value);
			if ($val.size()!=0) {
				$val=$($val[0]);
			} else {
				$val = $('<input type="'+((d.mode=="any")?"text":"hidden")+'" class="value" value="" />').appendTo(obj);
			}
			
			//binding event listener to input field that holds tagstrip selection value,
			//if some code change value of field, it must fire update event on it 
			//to force tagstrip redraw
			$val.data("tagstrip", {root:obj}).bind("update.tagstrip", function(){
				var $o=$(this); 
				var s = $o.val()||$o.html().compact();
				var root = $o.data("tagstrip").root;
				var data = root.data("tagstrip");
				var index = -1;
				for (var i=0; i<data.tags.length; i++) {
					if (data.tags[i]!=null && data.tags[i].value==s) index=i;
				}
				if (d.mode=="any") {
					data.active=index;
					root.tagstrip("redraw");
				} else if (d.mode=="one") {
					if (data.active!=index && index!=-1) {
						data.active=index;
						root.tagstrip("redraw");
					} else if (index==-1) {
						if (data["tags"][data.active]!=null) $val.val(data["tags"][data.active].value).html(data["tags"][data.active].value);
						$.error("Value '"+s+"' is inacceptable for tagstrip."+$o.html());
					}
				}
			})
			
			if (Object.isObject(d.data) || (Object.isArray(d.data) && d.data.length>0) ) {
				//we have input data, so we render new tagstrip
				//content of vars div goes as template
				
				var template = d.template||obj.find(d.vars).html()||"";
				if (template) {
					d.template=template;
					var html="", raw = [];
					if (Object.isArray(d.data)) {
						raw = d.data;
					} else {
						var list = true;
						Object.each(d.data, function(key, val){
							list = list && Object.isObject(val);
							raw.push($.extend(true,{name:key}, val));
						});
						if (!list) raw = [d.data];
					}
					for (var i=0; i<raw.length; i++) {
						html+=d.generator(raw[i], template);
					}
					obj.find(d.vars).html(html);
				}
				
			} 		
				
				
				
			var $tags = obj.find(d.tag);
			
			var tags = [];
			$tags.each(function(index){
				var $o=$(this);
				
				tags[index] = {
					value:($o.data("value")!=null)?String($o.data("value")):String($o.html()),
					name:""+$o.html(),
					title:$o.attr("title")||""
				};
				if ($o.hasClass(d.active) && active == -1) active = index;
				$o.data("tagstrip", {
					root:obj,
					index:index
				}); 
				$o.bind("click", function() {
					var $o=$(this); 
					var data = $o.data("tagstrip");
					if (data.root && data.index!=null) {
						data.root.data("tagstrip").active = data.index;
						data.root.tagstrip("redraw");
					}
				})
			})

			obj.data("tagstrip",{
				$tags:$tags,
				tags:tags,
				$val:$val,
				active:active,
				d:d
			})
			
			
		},
		redraw: function() {
			var obj = $(this);
			var data = obj.data("tagstrip");
			var $tags = data["$tags"];
			$tags.removeClass("active");
			var mode = data.d.mode;
			if (data.active!=-1) {
				if (mode=="one") $($tags[data.active]).addClass("active");
				if (mode=="any" || mode == "one") {
					if (data.$val[0].nodeName.toLowerCase()=="input") {
						data.$val.val(data["tags"][data.active].value)
					} else {
						data.$val.html(data["tags"][data.active].value);
					}
				}
				data.$val.trigger(data.d.event);
			}
		}
	}

	$.fn.tagstrip = function( method ) {
		
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.tagstrip' );
		}
	};

})( jQuery );