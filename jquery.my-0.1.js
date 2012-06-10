

(function( $ ){
	var f = {
		bind: function (data, uiNode, val) { 
		//sets or retrieves data using bind function
		
			var bind = uiNode.bind;
			if (Object.isFunction(bind)) {
				return bind(data,val);
			} else if (Object.isString(bind)) {
				if (data[bind]!=null) {
					if (val!=null) data[bind] = String(val); 
					return data[bind];
				} 
			}
			return null;
		},
		
		
		isOut:function (data,val, uiNode, $formNode) {
		//checks if val is inconsistent for uiNode pattern
			
			var pat = uiNode.check;
			var err = uiNode["error"]||"Ошибка";
			if (Object.isFunction(pat)) {
				return pat(data,val, $formNode);
			} else if (Object.isRegExp(pat)) {
				return ( (pat.test(String(val))) ? "":err );
			} else if (Object.isArray(pat)) {
				return ( (pat.indexOf(val)>-1)?"":err);				
			} else if (Object.isString(pat)) {
				return (val==pat?"":err);
			}
			return err;
		},
		
		field:function(jo,val) { 
			//sets or retrieves field value
			var type = jo[0].nodeName.toLowerCase();
			
			if (val!=null) { //set
				if (type=="input") {
					var stype = jo.eq(0).attr("type").toLowerCase();
					if ((/^number|text|hidden|password$/).test(stype)) {
						if (jo.val()!=val) {
							jo.val(val);
							if (jo.hasClass("ui-slider-input")) jo.slider("refresh");
							if (jo.data("tagstrip") && jo.data("tagstrip").root) jo.trigger("update");
						}
					} else if (stype=="radio") {
						var pos = -1;
						jo.each(function(ind) {
							var v = $(this).val();
							if (v==val) pos=ind;
						})
						jo.each(function(){$(this).attr("checked",false).checkboxradio("refresh")});
						if (pos>-1) {
							jo.eq(pos).attr("checked",true).checkboxradio("refresh");
						}
					}
				} else if (type=="select") {
					if (jo.val()!=val) {
						jo.val(val);				
						if (jo.hasClass("ui-slider-switch")) 
							jo.slider("refresh"); else jo.selectmenu("refresh",true);
					}
				}  else if (type=="textarea") {
					if (jo.val()!=val) jo.val(val);
				} else if ((/^p|div|span|li|t[dh]|a$/).test(type)) {
					jo.html(val);
				} else if (type=="img") {
					jo.attr("src",val);
				}
				return val;
			} else { //retrieve
				if (type=="input") {
					var stype = jo.eq(0).attr("type").toLowerCase();
					if ((/^number|text|hidden|password$/).test(stype) ) {
						return jo.val();
					} else if (stype=="radio") {
						var c = "";
						jo.each(function(){
							if (this.attributes["checked"]) c=$(this).val();
						})
						return c;
					}
				} else if ((/^select|textarea$/).test(type)) {
					return jo.val();				
				} else if ((/^p|div|span|li|t[dh]|a$/).test(type)) {
					return jo.html().compact();
				} else if (type=="img") {
					return jo.attr("src");
				}
			}
		},
		update:function ($o, value, depth) {
			var $this = $o, xdata = $this.data("my");
			if (xdata) {
				$root = xdata.root, $container = xdata.container;
				var selector = xdata.selector, d = xdata.data, oui = xdata.ui;
				var p =  $root.data("my").params, ui = $root.data("my").ui;
				
				if (value!=null) {
					var val = value;
				} else {
					val = f.field($root.find(selector),f.bind(d,oui));
				}
				
				//validating, if correct putting to data
				var err = f.isOut(d,val,oui, $this);
				if (err=="") {
					$root.data("my").errors[selector]= "";
					f.bind(d,oui,val);
					$container.removeClass("my-error").find(p.errorTip).removeClass("my-error").html("").hide();
				} else {
					$root.data("my").errors[selector]= err;
					$container.addClass("my-error").find(p.errorTip).addClass("my-error").show().html(err);
				}
				
				//applying conditional formatting if any
				if (oui.css) {
					for (var css in oui.css) {
						var oc = oui.css[css];
						if (Object.isRegExp(oc)) {
							if (oc.test(val)) {
								$container.addClass(css)
							} else {
								$container.removeClass(css)
							}
						} else if (Object.isFunction(oc)) {
							if (oc(data,val)) {
								$container.addClass(css)
							} else {
								$container.removeClass(css)
							}
						}
					}
				}
				
				if (depth && oui.recalc) {
					var list = oui.recalc, dest = [], once = {};
					if (Object.isString(list)) list = list.split(",");				
					if (Object.isArray(list)) {
						for (var i in list) {
							if (list[i] && Object.isString(list[i])) {
								var item = list[i].compact();
								if (ui[item]) {
									if (ui[item].recalc) {
										if (dest.indexOf(item)==-1) dest.push(item);
									} else {
										once[item]=true;
									}
								}
							}
						};
						for (var i=0; i<dest.length; i++) {
							once = $.extend(true, once, f.update($root.find(dest[i]),null,depth-1));
						}
						if (value!==null) {
							for (i in once) {
								if (once[i]===true && i!=selector) f.update($root.find(i),null,depth-1);
							}
							return {};
						}
					}
				}
				return once||{};
			}
		}
	};
	
	var methods = {
		  
		//######### INIT ##############
			
		init : function( data ) { 
			var obj = this;
			if (!data) {
				return obj;
			}
			
			//####### default params, may be overriden #########
			
			var p = $.extend(true,{
				getContainer:function(jobj) { 
					//returns container div for field or whatever if any 
					//it can be the firstmost elt with fieldcontain role or
					//fieldset, div or form in depth of not mre than 2
					if ( !(/^(div|span|a|li|p|h[1-4])$/).test($(jobj)[0].tagName.toLowerCase())) {
						var op = jobj.parents('*[data-role="fieldcontain"], *.tagstrip');
						if (op.size()==0){
							var oa =  jobj.parents('*');
							var op0=false;
							for (var i =0; i<3; i++) {
								if (!op0 && (/div|span|form|fieldset/).test(oa[i].tagName.toLowerCase())) {
									op0 = oa[i];
								}
							}
							if (!op0) return jobj; else return $(op0);
						}
						return $(op[0]);
					} else {
						return jobj;
					}
			  	},
			  	commit:function() {
			  		
			  	},
			  	recalcDepth:2,
			  	errorTip:".my-error-tip",
			  	oninit:function(){}
			  }, data.params||{}) ;
			 
			var ui = $.extend(true,{}, data.ui||{}) ;
			
			var d = data.data//$.extend(true,{}, data.data||{}) ;
			obj.data("my", {
				data:d, 
				params:p, 
				errors:Object.extended(), 
				ui:Object.extended(ui)	
			});
			
			for (var i in ui) {
				var  o = $(this).find(i);
				var dui = ui[i];
				if (o.size()>0) {
					var v = f.bind(d,dui,null);
					if (v!=null) {
						f.field(o,v);
						o.each(function() {
							var $this = $(this);
							$this.bind("blur.my input.my change.my check.my", function(){
								f.update($this, f.field($this.data("my").root.find($this.data("my").selector)), p.recalcDepth);								
								//here must be recalc and redraw
							}).data("my",{
								selector:i,
								ui:dui,
								initial:v,
								previous:v,
								root:obj,
								data:d,
								container:p.getContainer($this)
							});
						});
					} else {
						try {console.log("Not found "+i+" selector");} catch (e) {};
					}
				}
			}
			for (var i in ui) {
				this.find(i).trigger("check");
			};
			obj.data("my").initial = $.extend(true,{},d);
			if ($.mobile) $.mobile.changePage($.mobile.activePage);
		},
		
		//###### REDRAW ######
		
		redraw : function() {
			var $this = this;
			$this.data("my").ui.each(function(key) {
				f.update($this.find(key), undefined , $this.data("my").params.reclcDepth)
			})
		},
		
		//###### SET OR RETRIEVE DATA ######
		
		data: function(data) {
			if (data!=null) {
				$.extend(true, this.data("my").data, data);
				this.my("redraw");
			}
			return $(this).data("my").data;
		},
		
		//###### RESET INITIALS ######
		
		reset: function () {
			$.extend(true, this.data("my").data, this.data("my").initial);
			this.my("redraw");
		}
	};

	$.fn.my = function( method ) {
		
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.my' );
		}
	};

})( jQuery );


var calc = {
	make: function(data, bounds) {
	//Returns interpolator function of (x,y).
	//data is array of fixed points in xyz space, formed like a table of values of z(x,y) function
	//where x and y grows monotonically by columns and rows
	/*[
	 * [.1,	0,	100		], //here .1 is precision, 0 and 100 x coordinates of fixed points
	 * [0,	1,	10		], //here 0 is y coordinate of values and 1,10 is values of z(0,0) and z(100,0)
	 * [10,	10,	1000	], //here 10 is y coordinate of values and 10,1000 is values of z(0,10) and z(100,10)
	 * [20,	20,	1500	]  //here 20 is y coordinate of values and 20,1500 is values of z(0,0) and z(100,0)
	]*/
	// bounds is arbitrary function of x,y which must return false if xy pair of args lays outside 
	// of required boundaries.

	//For example
	//	calc.make([[1,1,10],[1,1,10],[10,10,100]], function (x,y) {return !!(x>0 && y>0)})
	//will return function of x,y, calculating rounded integer product of arguments if they both are >0 or null otherwise

		var a = data.clone(), xc = a[0].length, yc = a.length;
		var ok = (Object.isFunction(bounds))?(bounds):function(x,y) {
			return !!(x>=a[0][1] && x<=a[0][xc-1] && y>=a[1][0] && y<=a[yc-1][0]);
		};
		var f = function (x,y) {
			if (isNaN(x) || isNaN(y) || !ok(x,y)) return null;
			var r = [[a[0][0]],[],[]], xi=0, yi = 0;
			for (var i=1; i<xc-1; i++) {
				if ( (x>=a[0][i] && x<= a[0][i+1]) ||
					 (i==1 && x<a[0][1]) || 
					 (i==xc-2 && x>a[0][xc-1])
				) {
					r[0][1]=a[0][i];
					r[0][2]=a[0][i+1];
					xi=i;
				}
			}
			if (xi>0) {
				for (var i=1; i<yc-1; i++) {
					if ((y>=a[i][0] && y<= a[i+1][0]) ||
						(i==1 && y<a[1][0]) || 
						(i==yc-2 && y>a[yc-1][0])	
					) {
						r[1] = [a[i][0], a[i][xi], a[i][xi+1]];
						r[2] = [a[i+1][0], a[i+1][xi], a[i+1][xi+1]];
						yi=i;
					} 					
				}
				if (yi>0) {
					var p11=r[1][1];var p12=r[1][2];var p21=r[2][1];var p22=r[2][2];
				    var x1=r[0][1];var x2=r[0][2];var y1=r[1][0];var y2=r[2][0];
				    var n = (p11+(x-x1)*(p12-p11)/(x2-x1))*(1-(y-y1)/(y2-y1))+(p21+(x-x1)*(p22-p21)/(x2-x1))*(1-(y2-y)/(y2-y1));
				    if (isNaN(n)) return null;
				    return r[0][0]*Math.round(n/r[0][0]);
				}
			}
			return null;
		}
		return f;
	},
	impo: function (x0,y0,px,py, add0) {
		var add = add0||4, x=1*x0+add, y=1*y0+add;
		function f(x) {return Math.floor(x);}
		return Math.max( f(py/y)*f(px/x), f(px/y)*f(py/x) );
	},
	filter: function (obj, f) {
		if (!Object.isObject(obj) || !Object.isFunction(f)) return {};
		var o = {};
		for (i in obj) {
			if (f(i, obj[i])) o[i]=obj[i];
		}
		return o;
	}
}




/*ᴥ 1D25*/
