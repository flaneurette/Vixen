/* ***** BEGIN LICENSE BLOCK *****
 * 
 * Copyright (C) 2011 SUN.IO, Sasha van den Heetkamp.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version. This source may not be used in 
 * proprietary software and programs. 
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 *
 * SUN.IO - Sasha van den Heetkamp.
 * Electronic mail: sasha@sun.io
 *
 *
 ***** END LICENSE BLOCK ***** */ 

Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/ctypes.jsm");

var vixen = {

	init: function (parentId) {
		return document.getElementById(parentId);
	},

	get: function (parentId) {
		return document.getElementById(parentId).value;
	},

	set: function (parentId, str) {
		document.getElementById(parentId).value = str;
	},

	append: function (parentId, str, newline) {
		if(newline) {
			document.getElementById(parentId).value += str + "\r\n";
		} else {
			document.getElementById(parentId).value += str;
		}
	},

	childs: function (parentId) {
		return document.getElementById(parentId).childNodes;
	},

	warn: function (message) {
		if(this.prompter('warning', message)) {} else {
			return false;
		}
	},
  
    cleanregexp: function(str) {
      str = str.replace(/\_/g, "\\_");
      str = str.replace(/\[/g, "\\[");
      str = str.replace(/\]/g, "\\]");
      str = str.replace(/\?/g, "\\?");
      str = str.replace(/\+/g, "\\+");
      str = str.replace(/\^/g, "\\^");
      str = str.replace(/\$/g, "\\$");
      str = str.replace(/\(/g, "\\(");
      str = str.replace(/\)/g, "\\)");
      str = str.replace(/\{/g, "\\{");
      str = str.replace(/\}/g, "\\}");
      str = str.replace(/\|/g, "\\|");
      str = str.replace(/\-/g, "\\-");
      return str;
    },

	loadchrome: function (dia) {

		var message = '';
		var params = {
			promptparams: {
				description: message
			},
			out: null
		};

		switch(dia) {
		case 'about':
			var dialog = 'chrome://vixen/content/dialogs/about.xul'
			break;
		case 'help':
			var dialog = 'chrome://vixen/content/dialogs/help.xul'
			break;
		}

		window.openDialog(dialog, "vixen", "chrome, dialog, modal, resizable=yes", params).focus();
		if(params.out) {
			return true;
		} else {
			return false;
		}

	},

	filemode: function (mode) {
		document.getElementById('vixen-action-menu-mode').label = 'Mode: ' + mode;
		vixen.setScriptMode(mode);
	},

	prog: function (str) {
		this.set('vixen-progress', str);
	},

	progressbar: function () {
      
        vixen.polling();
      
		var tick = this.get('vixen-progress');
		for(var i = tick; i <= 10; i++) {
			this.prog(i * 10);
			this.threadingTick();
		}
	},

	elements: function (parentId, nodeName, attributes, stopAt) {
		if(stopAt) {
			var count = this.childs(parentId);
			if(count.length >= stopAt) {
				this.warn('Maximum tabs reached!');
				return;
			}
		}
		var elem = document.getElementById(parentId);
		var node = document.createElement(nodeName);
		for(attrib in attributes) {
			node.setAttribute(attrib, attributes[attrib]);
		}
		elem.appendChild(node);
	},

    clearconsole: function() {
      var element = document.getElementById("js-console");
        while (element.firstChild) {
          element.removeChild(element.firstChild);
      }
      
      var rl = document.getElementById("js-console").firstChild;
      var items = document.createElement("richlistitem");
      rl.parentNode.insertBefore(items, rl);
      
    },
  
	remove: function (parentId, command, attribute) {
		switch(command) {
		case 'attribute':
			var item = this.childs(parentId);
			for(var t = 0; t < item.length; ++t) {
				item[t].removeAttribute(attribute);
			}
			break;
		}
	},

	searchHighlight: function () {

		var file = this.treeFileClicked('vixen-root-search');
		var line = this.treeRowClicked('vixen-root-search');

		if(file.match(/(\\|\\\\|\/)/)) {

			vixen.commands('N');

			setTimeout(function () {
				vixen.readSingleFile(file);
			}, 110)

		} else {

			var item = this.childs('document-tabs');
			for(var t = 0; t < item.length; ++t) {
				item[t].setAttribute("selected", false);
				this.hideTick('vixen-hbox-' + t);
				this.hideTick('wysiwyg-show-' + t);
				if(item[t].label == file) {
					var location = t;
					item[t].setAttribute("selected", true);
					this.showTick('vixen-hbox-' + t);
					this.showTick('wysiwyg-show-' + t);
				}
			}
			var framename = 'wysiwyg-editor-' + location;
			var vixframe = document.getElementById(framename);
			return vixframe.contentWindow.gotoline(line);
		}
	},

	clearSearchTree: function (parentId) {
		this.removeBoxes(parentId);
	},

	searchtools: function (what) {

		this.clearSearchTree("vix-search-children");

		var sources = new Array();
		var results = new Array();
		var searchfor = this.get('js-searchbox');
		var replacewith = this.get('js-replacebox');

		var recursive = false;
	
		if(this.init('search-current').checked) {
			var n = document.getElementById('document-tabs');
			var childs = this.childs('document-tabs');
			var num = childs.length;
			if(num >= 1) {
				for(var i = num - 1; i >= 0; i--) {
					if(childs[i].selected == true) {
						sources.push([i, childs[i].label, this.getIFrameSourceAtId(i)]);
					}
				}
			}
		}

		if(this.init('search-openfiles').checked) {
			var n = document.getElementById('document-tabs');
			var childs = this.childs('document-tabs');
			var num = childs.length;
			if(num >= 1) {
				for(var i = num - 1; i >= 0; i--) {
					sources.push([i, childs[i].label, this.getIFrameSourceAtId(i)]);
				}
			}
		}

		if(this.init('search-regxp').checked) {
			if(searchfor) {
				try {
					var matchcode = new RegExp(searchfor);
				} catch(e) {
					this.warn('Compiling regular expression failed!');
				}
			} else {
				this.warn('Cannot perform regular expression search without a expression!');
			}
		} else {
			var matchcode = vixen.cleanregexp(searchfor);
		}

		switch(what) {

		case 'find':

			var len = sources.length;
			for(i = 0; i < len; i++) {
				var data = sources[i][2].split("\n");
				for(j = 0; j < data.length; j++) {
					if(data[j].match(matchcode)) {
						results.push([j, sources[i][1], data[j].replace(/(\\r\\n|\\n|\\r|\\t)/gm, '').replace(/\\"/gm, '"')]);
						try {
							var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
							var vixframe = document.getElementById(framename);
							var content = vixframe.contentWindow.highline(p);
						} catch(e) {}
					}
				}
			}

			for(p = 0; p < results.length; p++) {
				this.tree('vix-search-children', [(results[p][0] + 1), results[p][1], results[p][2]], false, false, false);
			}

			break;

		case 'findfiles':

            vixen.polling();
            
			var dir = vixen.opendir();

			if(dir) {
              
				var dirlist = vixen.dirOpen(dir);
				var res = vixen.readDirectories(dirlist, recursive);
				for(p = 0; p < res.length; p++) {
					let path = res[p].path;
					if(path.match(".")) {
						var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
						file.initWithPath(path);
						if(file.exists() == false) {
							this.warn('File does not exist!');
							return false;
						}

						NetUtil.asyncFetch(file, function (inputStream, status) {
                          
                          if(vixen.init('search-regxp').checked) {
                             var matchAt =  new RegExp(vixen.get('js-searchbox'));  
                               } else {
                              var matchAt = vixen.cleanregexp(vixen.get('js-searchbox')); 
                          }
							vixen.progressbar();
							if(!Components.isSuccessCode(status)) {
								this.warn('Error opening file!');
								return;
							}
							vixen.set('vixen-progress', 0);
							var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());

							try {
								var databucket = data.split("\n");
								for(j = 0; j < databucket.length; j++) {
									if(databucket[j].match(matchAt)) {
										vixen.tree('vix-search-children', [j, path, databucket[j]], false, false, false);
									}
								}
							} catch(e) {}
						});
					}
				}
			}

			break;


		case 'replace':

			var len = sources.length;
            
            if(vixen.init('search-regxp').checked) {
                var matchcode =  new RegExp(vixen.get('js-searchbox'));
                } else {
                 var matchcode = vixen.cleanregexp(vixen.get('js-searchbox'));
            }
            
			for(i = 0; i < len; i++) {
				var data = sources[i][2].split("\n");
				for(j = 0; j < data.length; j++) {
					if(data[j].match(matchcode)) {
						results.push([j, sources[i][1], data[j].replace(/(\\r\\n|\\n|\\r|\\t)/gm, '').replace(/\\"/gm, '"')]);
					}
				}

				sources[i][2] = vixen.replaceAll(sources[i][2], matchcode, replacewith);
				var framename = 'wysiwyg-editor-' + sources[i][0];
				var vixframe = document.getElementById(framename);
				var content = vixframe.contentWindow.setcode(sources[i][2]);
			}

			for(p = 0; p < results.length; p++) {
				this.tree('vix-search-children', [(results[p][0] + 1), results[p][1], results[p][2]], false, false, false);

			}

			break;

		}
      vixen.polling();
	},

	getdata: function (str) {
		return(str);
	},

	replaceAll: function (text, find, replace) {
		var re = new RegExp(vixen.quoting(find), "g");
		return text.replace(re, replace);
	},

	quoting: function (str) {
		return vixen.cleanregexp(str);
	},

	closeSplit: function () {
		var split = document.getElementById('vix-last-splitter');
		split.setAttribute("state", "collapsed");
	},

	threadingTick: function () {
		var thread = Components.classes['@mozilla.org/thread-manager;1'].getService(Components.interfaces.nsIThreadManager).currentThread;
		thread.processNextEvent(true);
		return;
	},

	getOs: function () {
		return Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
	},

	geDir: function (location) {
		if(!location) {
			location = "Home";
		}
		return Components.classes["@mozilla.org/file/directory_service;1"].createInstance(Components.interfaces.nsIProperties).get(location, Components.interfaces.nsIFile);
	},

	treeRowClicked: function (parentId) {
		var tree = document.getElementById(parentId);
		var selection = tree.view.selection;
		return tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
	},

	treeFileClicked: function (parentId) {
		var tree = document.getElementById(parentId);
		var selection = tree.view.selection;
		return tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(1));
	},

	formatBytes: function (bytes) {
		var kb = 1024;
		var mb = kb * 1024;
		var gb = mb * 1024;
		var tb = gb * 1024;
		if((bytes >= 0) && (bytes < kb)) {
			return bytes + 'B';
		} else if((bytes >= kb) && (bytes < mb)) {
			return(bytes / kb).toFixed(2) + 'KB';
		} else if((bytes >= mb) && (bytes < gb)) {
			return(bytes / mb).toFixed(2) + 'MB';
		} else if((bytes >= gb) && (bytes < tb)) {
			return(bytes / gb).toFixed(2) + 'GB';
		} else if(bytes >= tb) {
			return(bytes / tb).toFixed(2) + 'TB';
		} else {
			return bytes + 'B';
		}
	},

	filebrowser: function (method) {
		switch(method) {

		case 'home':
			vixen.getHomeDir();
			break;

		case 'movedir':

			var treevalue = this.treeRowClicked('vixen-root-browser');

			if(vixen.fixPeriod(treevalue) == true) {

				var file = treevalue;
				vixen.commands('N');

				if(vixen.fixPeriod(file)) {
					setTimeout(function () {
						vixen.readSingleFile(file);
					}, 195)

					setTimeout(function () {
						var item = vixen.childs('document-tabs');
						for(var t = 0; t < item.length; ++t) {
							item[t].setAttribute("selected", false);
							try {
								vixen.hideTick('vixen-hbox-' + t);
								vixen.hideTick('wysiwyg-show-' + t);
                                } catch(e) { // jit
								vixen.hideTick('vixen-hbox-' + t);
								vixen.hideTick('wysiwyg-show-' + t);
							}
							if(item[t].label == file) {
								var location = t;
								item[t].setAttribute("selected", true);
								vixen.showTick('vixen-hbox-' + t);
								vixen.showTick('wysiwyg-show-' + t);
							}
						}

					}, 395)
				}

			} else {

				var dirlist1 = '';
				var dirlist2 = '';
				var clicked = vixen.treeRowClicked('vixen-root-browser');
				var list = clicked.split(vixen.getSlash());
				if(list.length >= 1) {
					for(y = 0; y < (list.length - 2); y++) {
						dirlist1 += list[y] + vixen.getSlash();
					}
					for(y = 0; y < (list.length - 1); y++) {
						dirlist2 += list[y] + vixen.getSlash();
					}
				}
				var dirlist = this.dirOpen(clicked);
				var res = vixen.readDirectories(dirlist, false);
				this.clearSearchTree("vix-root-dir");
				vixen.tree('vix-root-dir', [dirlist1, 'DIR', '', '', ''], false, false, false);
				vixen.tree('vix-root-dir', [dirlist2, 'DIR', '', '', ''], false, false, false);

				for(p = 0; p < res.length; p++) {
					if(res[p].isHidden()) {
						var hid = 'Yes';
					} else {
						var hid = '';
					}
					if(res[p].fileSize == '0') {
						var fsize = 'DIR';
					} else {
						var fsize = vixen.formatBytes(res[p].fileSize);
					}
					vixen.tree('vix-root-dir', [res[p].path, fsize, new Date(res[p].lastModifiedTime), res[p].permissions.toString(8), hid], false, false, false);
				}
			}
			break;
		}
	},
  
	// See:  http://kb.mozillazine.org/Io.js
	dirOpen: function (path) {
		try {
			var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);
			return file;
		} catch(e) {
			return false;
		}
	},

	readDirectories: function (dir, recursive) {
		var container = new Array();
		try {
			if(dir.isDirectory()) {
				if(recursive == null) {
					recursive = false;
                  } else {
                  recursive = true;
                }
				var files = dir.directoryEntries;
				container = this.enummerateDir(files, recursive);
			}
		} catch(e) {}
		return container;
	},

	enummerateDir: function (dir, recursive) {
		var directory = new Array();
		try {
			while(dir.hasMoreElements()) {
				directory.push(dir.getNext().QueryInterface(Components.interfaces.nsILocalFile));
			}
        
		} catch(e) {}
      return directory;
	},

	getSlash: function () {
		var os = this.getOs();
		switch(os) {
		case 'WINNT':
			var slash = '\\';
			break;
		case 'Linux':
			var slash = '/';
			break;
		case 'Darwin':
			var slash = '\\';
			break;
		default:
			var slash = '\\';
			break;
		}
		return slash;
	},

	fixPeriod: function (str) {

		if(vixen.treeFileClicked('vixen-root-browser') == 'DIR') {
			return false;
		} else {

			if(str.match(/\./g)) {

				var string = str.split(".");

				if(string.length >= 1) {
					if(string[string.length - 1].length >= 2 && string[string.length - 1].length <= 3) {
						return true;
					} else {
						return false;
					}
				} else {
					return false;
				}
			} else {
				return false;
			}
		}
	},

	getHomeDir: function () {

		var file = this.geDir("Home");
		var t = '';
		var entries = file.directoryEntries;
		var array = [];
		var slash = vixen.getSlash();
		while(entries.hasMoreElements()) {
			var entry = entries.getNext();
			entry.QueryInterface(Components.interfaces.nsIFile);
			array.push(entry);
			if(entry.isDirectory()) {
				var name = entry.path.split(slash);
				if(name.length >= 2 && !name[name.length - 1].match(/\./g)) {
					var dir = this.dirOpen(entry.path);
					var dirs = this.readDirectories(dir, false);
					if(entry.isHidden()) {
						var hidden = 'Yes';
					} else {
						var hidden = '';
					}
					if(entry.fileSize == '0') {
						var fsize = 'DIR';
					} else {
						var fsize = vixen.formatBytes(entry.fileSize);
					}
					if(dirs.length >= 1) {
						this.tree('vix-root-dir', [entry.path, fsize, new Date(entry.lastModifiedTime), entry.permissions.toString(8), hidden], true, true, false, dirs);
                        } else {
						this.tree('vix-root-dir', [entry.path, fsize, new Date(entry.lastModifiedTime), entry.permissions.toString(8), hidden], false, true, true);
					}
				}
			} else {
              // list as file, which we don't do now. Why? no clue. :o)
			}
		}
      vixen.polling();
	},

	prompter: function (scope, message) {
		var params = {
			promptparams: {
				description: message
			},
			out: null
		};
		window.openDialog("chrome://vixen/content/dialogs/prompter.xul", "vixen", "chrome, dialog, modal, resizable=yes", params).focus();
		if(params.out) {
			return true;
		} else {
			return false;
		}
	},

	preferences: function (type, str) {
		if(str.match(/#/)) {
			switch(type) {
			case 'backdrop':
				this.init('wysiwyg-editor-' + vixen.findCurrentId('document-tabs')).style.backgroundColor = str;
				break;
			case 'foreground':
				this.init('wysiwyg-editor-' + vixen.findCurrentId('document-tabs')).style.color = str;
				break;
			}
		} else {
			this.warn('Hash is missing!');
		}
	},

	tree: function (treeid, cells, colorscheme, container, state, dirs) {

		var items = document.createElement('treeitem');
		var row = document.createElement('treerow');
		if(container) {
			row.setAttribute('container', true);
		}
		if(state) {
			row.setAttribute('open', true);
		}
		if(colorscheme) {
			row.setAttribute('properties', 'classlistselect');
		}
		for(var i = 0; i < cells.length; i++) {
			var cell = document.createElement('treecell');
			cell.setAttribute('label', cells[i]);
			cell.setAttribute('value', true);
			row.appendChild(cell);
		}
		items.appendChild(row);

		document.getElementById(treeid).appendChild(items);

	},

	windowaction: function (method) {

		switch(method) {
		case 'selectall':
			this.setFunction().selAll();
			break;
		case 'copy':
			this.clipboard('copy', this.getIFrameSource());
			break;
		case 'paste':
			this.setFunction().setValueAtCursor(this.clipboard('paste'));
			this.updateTabStatus('document-tabs');
			break;
		case 'hidelines':
			this.setFunction().removeLn();
			break;
		case 'showlines':
			this.setFunction().showLn();
			break;
		case 'showdesign':
			this.showDesign();
			break;
		}
	},

	getFileInfo: function () {

		var datafile = vixen.getIFrameSource();
		var len = datafile.split('\r\n');
		var info = 'Lines:' + len.length;
		vixen.set('vixen-fileinfo', info);

	},

	getMenuFocus: function () {},

	setFunction: function () {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		return vixframe.contentWindow;
	},

	setTheme: function (mode) {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		var content = vixframe.contentWindow.selectTheme(mode);
	},

	setScriptMode: function (mode) {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		var content = vixframe.contentWindow.filemode(mode);
	},

	getScriptMode: function (mode) {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		var content = vixframe.contentWindow.getselectedmode();
		return content;
	},

	getIFrameSource: function () {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		var content = vixframe.contentWindow.getval();
		return content;
	},

	getIFrameSourceAtId: function (parentId) {
		var framename = 'wysiwyg-editor-' + parentId;
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		var content = vixframe.contentWindow.getval();
		return content;
	},

    getAreaInfo: function () {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
		} else {
			try {
				var lines = vixframe.contentWindow.getAreaData('lines');
				var chars = vixframe.contentWindow.getAreaData('chars');
				if(lines != undefined || chars != undefined) {
				vixen.set('vixen-area-data','Lines: '+lines+', Chr: ' +chars);
				}
			} catch(e) {}
		}
	},
  
	setIFrameSource: function (data, mime) {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe == null) {
			var vixframe = document.getElementById(framename);
		}
		var fmod = vixframe.contentWindow.xetval(data);
		if(mime) {
			vixframe.contentWindow.mimemode(mime);
		}
	},

	setFocus: function () {
		try {
			var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
			var vixframe = document.getElementById(framename);
			if(vixframe == null) {
				var vixframe = document.getElementById(framename);
			}
			vixframe.contentWindow.vixfocus();
		} catch(e) {}

	},

	updateCodeBox: function () {
		var framename = 'wysiwyg-show-' + vixen.findCurrentId('document-tabs');
		var iframeObject = document.getElementById(framename);
		var doc = iframeObject.contentWindow.document;
		var serializer = new XMLSerializer();
		var content = serializer.serializeToString(doc);
		this.setIFrameSource(content.replace('<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>', '').replace('</body></html>', ''));
	},

	clipboard: function (method, string) {

		switch(method) {
		case 'paste':
			var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
			if(!clip) return false;
			var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
			if(!trans) return false;
			trans.addDataFlavor("text/unicode");
			clip.getData(trans, clip.kGlobalClipboard);
			var str = new Object();
			var strLength = new Object();
			trans.getTransferData("text/unicode", str, strLength);
			if(str) {
				str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
				return str.data.substring(0, strLength.value / 2);
			}
			break;

		case 'copy':
			var copytext = string;
			var str = Components.classes["@mozilla.org/supports-string;1"].
			createInstance(Components.interfaces.nsISupportsString);
			if(!str) return false;
			str.data = copytext;
			var trans = Components.classes["@mozilla.org/widget/transferable;1"].
			createInstance(Components.interfaces.nsITransferable);
			if(!trans) return false;
			trans.addDataFlavor("text/unicode");
			trans.setTransferData("text/unicode", str, copytext.length * 2);
			var clipid = Components.interfaces.nsIClipboard;
			var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
			if(!clip) return false;
			clip.setData(trans, null, clipid.kGlobalClipboard);
			break;
		}
      
      vixen.polling();
	},

	pasteAtCaret: function (str) {
		var framename = 'wysiwyg-editor-' + vixen.findCurrentId('document-tabs');
		var vixframe = document.getElementById(framename);
		if(vixframe != null) {
			var fmod = vixframe.contentWindow.setValueAtCursor(str);
		}
	},

	removeBoxes: function (parentId, removeParent) {
		var box = document.getElementById(parentId);
		var childNode = document.getElementById(parentId).childNodes;
		var num = childNode.length;
		for(var i = num - 1; i >= 0; i--) {
			try {
				box.removeChild(childNode[i]);
			} catch(e) {
				threw = true;
			}
		}
		if(removeParent) {
			try {
				box.parentNode.removeChild(box);
			} catch(e) {
				threw = true;
			}
		}

		return;
	},

	removeTab: function () {

		var myListBox = document.getElementById('document-tabs');
		var childs = vixen.childs('document-tabs');
		var idx = vixen.findCurrentId('document-tabs');
		if(idx >= 1) {
			var re = /\*/g;
			if(childs[idx].label.match(re)) {
				if(vixen.prompter('save', 'Save changes before closing?')) {
					vixen.writer();
				}
			}
			/* The caveats of removing DOM nodes are many. We won't remove nodes, but hide them, 
                because we simply cannot afford crashes/conflicts/DOM-issues here at any cost. */
			childs[idx].style.display = 'none';
			var box = document.getElementById('wysiwyg-show-' + idx);
			box.style.display = 'none';
			var box = document.getElementById('wysiwyg-editor-' + idx);
			box.style.display = 'none';
			var box = document.getElementById('vixen-hbox-' + idx);
			box.style.display = 'none';

			//vixen.reIndexTabs('document-tabs');
			vixen.selectPreviousTab(idx);
            vixen.polling();
		}
	},

	selectPreviousTab: function (cID) {
		var n = document.getElementById('document-tabs');
		var childs = this.childs('document-tabs');
		var num = childs.length;
		if(num >= 1 && cID >= 1) {
			childs[cID - 1].setAttribute("selected", true);
		} else {
			childs[0].setAttribute("selected", true);
		}
		this.refreshChrome();
	},

	reIndexTabs: function (parentId) {
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;
		if(num >= 1) {
			for(var i = num - 1; i >= 0; i--) {
				childs[i].removeAttribute('selected');
			}
			childs[num - 1].setAttribute("selected", true);
		}

		return;
	},

	removeUnsavedStatus: function (parentId) {
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				childs[i].label = childs[i].label.replace('*', '');
				childs[i].tooltipText = childs[i].tooltipText.replace('*', '');
			}
		}
	},

	setSelectedTabLabel: function (parentId, tabLabel, path) {
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				childs[i].removeAttribute('label');
				childs[i].removeAttribute('tooltiptext');
				childs[i].setAttribute('label', tabLabel);
				childs[i].setAttribute('tooltiptext', path);
			}
		}
	},

	getSelectedTabLabel: function (parentId) {
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				return childs[i].label;
			}
		}
	},

	findCurrentId: function (parentId) {
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				return i;
			}
		}
	},

	parseDesign: function () {
		var editor = document.getElementById('wysiwyg-show-' + vixen.findCurrentId('document-tabs'));
	},

	showDesign: function () {

        vixen.polling();
      
		this.checkChrome('wysiwyg-show');

		var n = document.getElementById('document-tabs');
		var childs = this.childs('document-tabs');
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			try {
				document.getElementById('wysiwyg-show-' + i).style.display = 'none';
			} catch(e) {}
			if(childs[i].selected == true) {
				editor = document.getElementById('wysiwyg-show-' + i);
			}
		}

		if(editor != null) {
			editor.style.display = '-moz-box';
			editor.contentDocument.designMode = 'on';
			editor.contentDocument.innerHTML = '';
			try {
				editor.contentDocument.body.innerHTML = vixen.getIFrameSource();
				//editor.addEventListener('keypress', vixen.parseDesign, false);
			} catch(e) {
				threw = true;
			}
			var split = document.getElementById('wysiwyg-splitter');
			split.setAttribute("state", "open");
			try {
				document.getElementById('wysiwyg-show-' + vixen.findCurrentId('document-tabs')).contentDocument.addEventListener('keypress', function () {
					vixen.updateCodeBox()
				});
			} catch(e) {}
		} else {
			this.warn('No document connected!');
		}
	},
	syncDesign: function () {
		this.showDesign();
	},

	changeFont: function (size) {
		var codebox = document.getElementById('wysiwyg-editor-' + vixen.findCurrentId('document-tabs'));
		codebox.style.fontSize = size + 'px';
		var linebox = document.getElementById('vixen-linebox-' + vixen.findCurrentId('document-tabs'));
		linebox.style.fontSize = size + 'px';
	},

	hideTick: function (parentId) {
		try {
			var t = document.getElementById(parentId);

			if(parentId.match(/show/i)) {
				t.style.display = 'none';
			} else {
				t.setAttribute('hidden', true);
			}

		} catch(e) {}
	},

	showTick: function (parentId) {
		try {
			var t = document.getElementById(parentId);

			if(parentId.match(/show/i)) {
				t.style.display = '-moz-box';
			} else {
				t.setAttribute('hidden', false);
			}

		} catch(e) {}

	},

	checkChrome: function (parentId) {
		var n = document.getElementById('document-tabs');
		var childs = this.childs('document-tabs');
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				this.showTick(parentId + '-' + i);
				this.set('vixen-filepath', childs[i].tooltipText);
				vixen.selectedMimeType(childs[i].tooltipText);
			} else {
				this.hideTick(parentId + '-' + i);
			}
		}
	},

	refreshChrome: function () {
		// update vboxes
		this.checkChrome('vixen-hbox');
		this.checkChrome('wysiwyg-show');
		setTimeout("vixen.setFocus()", 21);
	},

	updateChrome: function () {

		var tick = vixen.findCurrentId('document-tabs');

		var editorChrome = document.getElementById('fp-vbox-editor');

		var hbox = document.createElement('box');
		hbox.setAttribute('class', 'vixen-hbox');
		hbox.setAttribute('id', 'vixen-hbox-' + tick);
		hbox.setAttribute('flex', '3');
		editorChrome.appendChild(hbox);

		var hboxChrome = document.getElementById('vixen-hbox-' + tick);

		var CdArea = document.createElement('iframe');
		CdArea.setAttribute('id', 'wysiwyg-editor-' + tick);
		CdArea.setAttribute('class', 'wysiwyg-editor');
		CdArea.setAttribute('flex', 3);
		CdArea.setAttribute('type', 'content');
		CdArea.setAttribute('editortype', 'html');
		CdArea.setAttribute('src', 'chrome://vixen/content/codemirror/mirror.html?refresh=' + Math.random());
		CdArea.setAttribute('height', 450);
		CdArea.setAttribute('width', '100%');
		//CdArea.addEventListener('keypress', vixen.trigger, true);
		hboxChrome.appendChild(CdArea);

		var vboxChrome = document.getElementById('fp-vbox-wysiwyg');
		var frame = document.createElement('iframe');
		frame.setAttribute('id', 'wysiwyg-show-' + tick);
		frame.setAttribute('class', 'wysiwyg-show');
		frame.setAttribute('type', 'content');
		frame.setAttribute('editortype', 'html');
		frame.setAttribute('src', 'chrome://vixen/content/template.html?refresh=' + Math.random());
		frame.setAttribute('flex', 1);
		frame.setAttribute('height', 100);
		frame.setAttribute('width', 555);
		frame.setAttribute('designMode', 'on');
		vboxChrome.appendChild(frame);
		this.refreshChrome();

		var split = document.getElementById('wysiwyg-splitter');
		split.setAttribute("state", "collapsed");

        vixen.polling();
	},

	updateTabStatus: function (parentId, rewind) {
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;
		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				var re = /\*/g;
				if(rewind == true) {
					if(childs[i].label.match(re)) {} else {
						childs[i].label += '*';
					}
				} else {

					if(childs[i].label.match(re)) {
						childs[i].label.replace('*', '');
					} else {}
				}
			}
		}
	},

	commands: function (key, parentName) {
      
        vixen.polling();

		switch(key) {
		case 'O':
			this.commands('N');
			this.openfile();
			break;
		case 'X':
			vixen.removeTab();
			break;
		case 'Q':
			var myListBox = document.getElementById('document-tabs');
			var count = myListBox.itemCount;
			k = 0;
			while(count-- > 0) {
				try {
					myListBox.removeItemAt(0);
					var box = document.getElementById('wysiwyg-show-' + k);
					box.parentNode.removeChild(box);
					var box = document.getElementById('wysiwyg-editor-' + k);
					box.parentNode.removeChild(box);
					var box = document.getElementById('vixen-hbox-' + k);
					box.parentNode.removeChild(box);
					k++;
				} catch(e) {
					k++;
				}
			}

			try {
				var split = document.getElementById('wysiwyg-splitter');
				split.setAttribute("state", "collapsed");
			} catch(e) {}

			break;

		case 'C':
			break;
		case 'V':
			break;
		case 'N':
			// new tab
			this.remove('document-tabs', 'attribute', 'selected');
			var counter = this.childs('document-tabs').length;
			if(parentName) {
				this.elements('document-tabs', 'tab', {
					'id': 'fptabs_menu_' + (counter + 1),
					'value': '',
					'label': parentName,
					'selected': true,
					'tooltiptext': parentName
				}, 20);
			} else {
				this.elements('document-tabs', 'tab', {
					'id': 'fptabs_menu_' + (counter + 1),
					'value': '',
					'label': 'Untitled.html*',
					'selected': true,
					'tooltiptext': 'Untitled.html*'
				}, 20);
			}
			this.updateChrome();
			vixen.updateTabStatus('document-tabs');
			break;
		case 'S':
			this.writer();
			vixen.removeUnsavedStatus('document-tabs');
			break;
		case 'F':
			this.showPanel();
			break;
		}
		return true;
	},

	showPanel: function () {
		var splitter = this.init('vix-last-splitter');
		splitter.setAttribute("state", "open");
        vixen.polling();

	},

	resizeWindow: function () {
		//window.resizeTo(screen.width, screen.height);
		window.resizeTo(screen.width, screen.height);
		window.moveTo((screen.width - window.outerWidth) / 2, 0);
	},

	trigger: function (e) {
		//var editor =  document.getElementById('wysiwyg-editor-'+vixen.findCurrentId('document-tabs'));
		switch(e.keyCode) {
		default:
			return;
			break;
		case e.DOM_VK_LEFT_CONTROL:
		case e.DOM_VK_RIGHT_CONTROL:
		case e.DOM_VK_CONTROL:
			break;
		case e.DOM_VK_RETURN:
			vixen.updateTabStatus('document-tabs');
			break;
			break;
		case e.DOM_VK_BACK_SPACE:
		case 8:
			break;
		case e.DOM_VK_TAB:
		case 9:
			break;
		case e.DOM_VK_UP:
		case e.DOM_VK_PAGE_UP:
			break;
		case e.DOM_VK_DOWN:
		case e.DOM_VK_PAGE_DOWN:
			break;
		case e.DOM_VK_ALT:
		case e.DOM_VK_LEFT_ALT:
		case e.DOM_VK_RIGHT_ALT:
			break;
		case e.VK_CANCEL:
			break;
		case e.VK_BACK:
			break;
		case e.VK_TAB:
			break;
		case e.VK_CLEAR:
			break;
		case e.VK_RETURN:
			break;
		case e.VK_ENTER:
			break;
		case e.VK_SHIFT:
			break;
		case e.VK_CONTROL:
			break;
		case e.VK_PAUSE:
			break;
		case e.VK_CAPS_LOCK:
			break;
		case e.VK_ESCAPE:
			break;
		case e.VK_SPACE:
			break;
		case e.VK_PAGE_UP:
			break;
		case e.VK_PAGE_DOWN:
			break;
		case e.VK_END:
			break;
		case e.VK_HOME:
			break;
		case e.VK_LEFT:
			break;
		case e.VK_UP:
			break;
		case e.VK_RIGHT:
			break;
		case e.VK_DOWN:
			break;
		case e.VK_PRINTSCREEN:
			break;
		case e.VK_INSERT:
			break;
		case e.VK_DELETE:
			break;
		case e.VK_F1:
			break;
		case e.VK_F2:
			break;
		case e.VK_F3:
			break;
		case e.VK_F4:
			break;
		case e.VK_F5:
			break;
		case e.VK_F6:
			break;
		case e.VK_F7:
			break;
		case e.VK_F8:
			break;
		case e.VK_F9:
			break;
		case e.VK_F10:
		case e.DOM_VK_F10:
			vixen.showDesign();
			break;
		case e.VK_F11:
		case e.DOM_VK_F11:
			vixen.resizeWindow();
			break;
		case e.VK_F12:
			break;
		case e.VK_NUM_LOCK:
			break;
		case e.VK_SCROLL_LOCK:
			break;
		case e.VK_HELP:
			break;
		}
      vixen.polling();
	},

	selectedMimeType: function (tiptext) {

		var name = tiptext.split('.');
		var mtype = name[name.length - 1];
		var mime = mtype.replace('*', '');

		switch(mime) {

		default:
			cmode = 'text';
			break;

		case 'html':
		case 'shtml':
		case 'htm':
		case 'xhtml':
		case 'dhtml':
			cmode = 'htmlmixed';
			break;

		case 'php':
		case 'php2':
		case 'php3':
		case 'php4':
		case 'php4':
		case 'phtml':
		case 'inc':
			cmode = 'php';
			break;

		case 'js':
		case 'jsx':
			cmode = 'javascript';
			break;

		case 'rhtml':
		case 'rb':
		case 'rjs':
		case 'erb':
			cmode = 'ruby';

			break;

		case 'css':
		case 'hss':
		case 'sass':
		case 'less':
		case 'ccss':
			cmode = 'css';
			break;

		case 'pl':
			cmode = 'perl';
			break;

		case 'py':
			cmode = 'python';
			break;

		case 'c':
			cmode = 'clike';
			break;

		case 'xml':
		case 'rss':
		case 'svg':
		case 'dtd':
		case 'xul':
			cmode = 'xml';
			break;

		case 'jpg':
		case 'gif':
		case 'bmp':
		case 'tif':
		case 'png':
			cmode = 'text';
			break;

		}
		document.getElementById('vixen-action-menu-mode').label = 'Mode: ' + cmode;
		return;
	},

	createMenuItems: function (childId, arr) {

		switch(arr) {
		case 'HTML4':
			var elem = HTML4;
			break;
		case 'HTML5':
			var elem = HTML5;
			break;
		case 'DOC':
			var elem = DOCTYPES;
			break;
		case 'J_QUERY':
			var elem = J_QUERY;
			break;
		case 'C_SCHEME':
			var elem = C_SCHEME;
			break;
		case 'CSS_SCHEME':
			var elem = CSS_SCHEME;
			break;
		case 'MOZ_CSS':
			var elem = MOZ_CSS;
			break;
		case 'XUL_ELEMENTS':
			var elem = XUL_ELEMENTS;
			break;
		case 'XUL_ATTRIBUTES':
			var elem = XUL_ATTRIBUTES;
			break;
		case 'XUL_EVENTS':
			var elem = XUL_EVENTS;
			break;
		case 'PHP_A':
			var elem = PHP_A;
			break;
		case 'PHP_B':
			var elem = PHP_B;
			break;
		case 'PHP_C':
			var elem = PHP_C;
			break;
		case 'PHP_D':
			var elem = PHP_D;
			break;
		case 'PHP_E':
			var elem = PHP_E;
			break;
		case 'PHP_F':
			var elem = PHP_F;
			break;
		case 'PHP_G':
			var elem = PHP_G;
			break;
		case 'PHP_H':
			var elem = PHP_H;
			break;
		case 'PHP_I':
			var elem = PHP_I;
			break;
		case 'PHP_J':
			var elem = PHP_J;
			break;
		case 'PHP_K':
			var elem = PHP_K;
			break;
		case 'PHP_L':
			var elem = PHP_L;
			break;
		case 'PHP_M':
			var elem = PHP_M;
			break;
		case 'PHP_N':
			var elem = PHP_N;
			break;
		case 'PHP_O':
			var elem = PHP_O;
			break;
		case 'PHP_P':
			var elem = PHP_P;
			break;
		case 'PHP_Q':
			var elem = PHP_Q;
			break;
		case 'PHP_R':
			var elem = PHP_R;
			break;
		case 'PHP_S':
			var elem = PHP_S;
			break;
		case 'PHP_T':
			var elem = PHP_T;
			break;
		case 'PHP_U':
			var elem = PHP_U;
			break;
		case 'PHP_V':
			var elem = PHP_V;
			break;
		case 'PHP_W':
			var elem = PHP_W;
			break;
		case 'PHP_X':
			var elem = PHP_X;
			break;
		case 'PHP_Z':
			var elem = PHP_Z;
			break;

		}

		if(elem) {
			for(var j = 0; j < elem.length; j++) {
				var rl = document.getElementById(childId);
				var description = document.createElement("menuitem");
				description.setAttribute("label", elem[j]);
				description.onclick = function () {
					vixen.pasteAtCaret(this.label);
				};
				rl.appendChild(description);
			}
		}
	},

	opendir: function () {

		try {
			const nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			fp.init(window, 'Browse', nsIFilePicker.modeGetFolder);
			fp.appendFilters(nsIFilePicker.filterAll);
			var rv = fp.show();
			if(rv == nsIFilePicker.returnOK) {
				return fp.file.path;
			}
		} catch(ex) {}
		return false;
	},

	readSingleFile: function (pathTo) {

		vixen.progressbar();
        vixen.polling();

		var path = pathTo;
		filename = path.split(vixen.getSlash());

		cmime = filename[filename.length - 1];
		fmime = cmime.split('.');
		var mime = fmime[fmime.length - 1];

		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(path);
		if(file.exists() == false) {
			this.warn('File does not exist!');
			return false;
		}

		NetUtil.asyncFetch(file, function (inputStream, status) {

			vixen.progressbar();

			var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());

			if(!Components.isSuccessCode(status)) {
				this.warn('Error opening file!');
				return;
			}

			vixen.set('vixen-filepath', path);
			vixen.setSelectedTabLabel('document-tabs', filename[filename.length - 1], path);
			vixen.set('vixen-progress', 0);
			vixen.setIFrameSource(data, mime);
			//vixen.getFileInfo();
		});

		vixen.selectedMimeType(filename[filename.length - 1]);
		return;

	},

	openfile: function () {

        vixen.polling();
      
		const nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, 'Browse', nsIFilePicker.modeOpen);
		fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
		var rv = fp.show();

		if(rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
			vixen.progressbar();
			var files = fp.file;
			var path = fp.file.path;
			filename = path.split(vixen.getSlash());

			cmime = filename[filename.length - 1];
			fmime = cmime.split('.');
			var mime = fmime[fmime.length - 1];

			var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);
			if(file.exists() == false) {
				this.warn('File does not exist!');
				return false;
			}

			NetUtil.asyncFetch(file, function (inputStream, status) {
              
              try {
				vixen.progressbar();

				var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());

				if(!Components.isSuccessCode(status)) {
					this.warn('Error opening file!');
					return;
				}

				vixen.set('vixen-filepath', path);
				vixen.setSelectedTabLabel('document-tabs', filename[filename.length - 1], path);
				vixen.set('vixen-progress', 0);
				vixen.setIFrameSource(data, mime);
                
              } catch(e) {}
				//vixen.getFileInfo();
			});
		}

		vixen.selectedMimeType(filename[filename.length - 1]);
		return;
	},

	writer: function () {
		var parentId = 'document-tabs';
		var n = document.getElementById(parentId);
		var childs = this.childs(parentId);
		var num = childs.length;

		for(var i = num - 1; i >= 0; i--) {
			if(childs[i].selected == true) {
				var re = /\*/g;
				if(this.get('vixen-filepath').match(/(\\|\/|\/\/)/i)) {
					var showFilePicker = false;
					var selectedIndx = this.get('vixen-filepath');
				} else {
					var showFilePicker = true;
					var selectedIndx = childs[i].label;
				}
				var data = this.getIFrameSource();
			}
		}

		if(showFilePicker == true) {

			const nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			fp.init(window, 'Save As', nsIFilePicker.modeSave);
			fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
			var rv = fp.show();
			if(rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
              
              try {
				vixen.progressbar();
				var files = fp.file;
				var path = fp.file.path;
				var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
				file.initWithPath(path);
              } catch(e) {}

				if(file) {
                  try {
					// update location and tabs
					this.set('vixen-filepath', path);
					filename = path.split(vixen.getSlash());
					this.setSelectedTabLabel('document-tabs', filename[filename.length - 1], path);
					vixen.selectedMimeType(filename[filename.length - 1]);
					// continue with stream.
					var ostream = FileUtils.openSafeFileOutputStream(file)
					var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
					converter.charset = "UTF-8";
					var istream = converter.convertToInputStream(data);
                  } catch(e) {}
				}
			}
		} else {

			var path = selectedIndx;
			var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(path);
  
			if(file) {
				vixen.progressbar();
				var ostream = FileUtils.openSafeFileOutputStream(file)
				var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
				converter.charset = "UTF-8";
				var istream = converter.convertToInputStream(data);
			} else {
				this.warn('Cannot save file, path is missing or incomplete!');
				return;
			}
		}

		NetUtil.asyncCopy(istream, ostream, function (status) {
			if(!Components.isSuccessCode(status)) {
				vixen.warn('Saving file failed!');
				return;
			}
			vixen.updateTabStatus('document-tabs');
		});
		vixen.prog(0);
		vixen.removeUnsavedStatus('document-tabs');
        vixen.polling();
	},

	runcode: function (custom) {

		var msg = '';
		var code = this.get('js-evl-string');
		try {
			msg = code.toString();
			var doc = document.getElementById("js-evl-frame");
			doc.contentWindow.location = "javascript: " + code.replace(/%/g, "%25");
		} catch(exf) {
			msg = "> error compiling javascript command: " + exf.message + "\r\n";
		}

		if(msg) {
			this.append("js-evl-result", msg, true);
		}
		code = '';
        vixen.polling();
	},

	readconsole: function (i) {

		this.ConsoleListener = {
			console: this,
			observe: function (consoleMsg) {
				if(consoleMsg.message != '') {
					var rl = document.getElementById("js-console").firstChild;
					var items = document.createElement("richlistitem");
					if(i % 2) {
						items.setAttribute("class", "richlistA");
					} else {
						items.setAttribute("class", "richlistB");
					}
					var description = document.createElement("description");
					description.appendChild(document.createTextNode(consoleMsg.message.replace(/%20/g, " ")));
					items.appendChild(description);
					rl.parentNode.insertBefore(items, rl);
				}
				i++;
			}
		};

		try {
			isupports = Components.classes['@mozilla.org/consoleservice;1'].getService();
			service = isupports.QueryInterface(Components.interfaces.nsIConsoleService);
			service.registerListener(this.ConsoleListener);
		} catch(e) {
			return;
		}
	},
  
    polling: function() {
      vixen.peakmemory();
      vixen.getAreaInfo('lines');
      vixen.getAreaInfo('chars');
    },
  
    peakmemory: function() {
      
      var os = this.getOs();
      
      switch(os) {
            
      case 'WINNT':
          
      var peakmem = 450; //MB

      var kernel = ctypes.open("kernel32.dll");
      var psapi  = ctypes.open("psapi.dll");
      
      var process = kernel.declare("GetCurrentProcess",ctypes.winapi_abi,ctypes.uint32_t); 
      var handle = process();
      kernel.close();
      
      const struct_pmc = new ctypes.StructType("_PROCESS_MEMORY_COUNTERS_EX",
                                               
        [{cb:                         ctypes.uint32_t},
         {PageFaultCount:             ctypes.uint32_t},
         {PeakWorkingSetSize:         ctypes.size_t  },
         {WorkingSetSize:             ctypes.size_t  },
         {QuotaPeakPagedPoolUsage:    ctypes.size_t  },
         {QuotaPagedPoolUsage:        ctypes.size_t  },
         {QuotaPeakNonPagedPoolUsage: ctypes.size_t  },
         {QuotaNonPagedPoolUsage:     ctypes.size_t  },
         {PagefileUsage:              ctypes.size_t  },
         {PeakPagefileUsage:          ctypes.size_t  },
         {PrivateUsage:               ctypes.size_t  }
        ]);
      
        var info = psapi.declare("GetProcessMemoryInfo",ctypes.winapi_abi,ctypes.bool,ctypes.uint32_t,struct_pmc.ptr,ctypes.uint32_t);    
      
        var pmc = new struct_pmc;
        var bool = info(handle, pmc.address(), struct_pmc.size);
      
        psapi.close();
          
        var workmem = Math.round(pmc.WorkingSetSize / 1024 / 1024);
        
        if(workmem > peakmem) {
          this.init('vixen-memory').className = 'memorypeak';
          this.set('vixen-memory','WARNING! High memory: '+ workmem + 'MB');
          } else {
          this.init('vixen-memory').className = 'memorybar';
          this.set('vixen-memory','Memory: '+ workmem + 'MB');
        }
 
        break;
      
        case 'Linux':
        case 'Darwin':
        // we can't yet.
        return;
		break; 
      
        default:
		// OS unknown, exit.
        return;
		break;
      }
    },

	startup: function () {
		vixen.createMenuItems('edit-popup-html5', 'HTML5');
		vixen.createMenuItems('edit-popup-html4', 'HTML4');
		vixen.createMenuItems('edit-popup-doc', 'DOC');
		vixen.createMenuItems('edit-popup-css', 'CSS_SCHEME');
		vixen.createMenuItems('edit-popup-moz-css', 'MOZ_CSS');

		vixen.createMenuItems('edit-popup-xul-elements', 'XUL_ELEMENTS');
		vixen.createMenuItems('edit-popup-xul-attributes', 'XUL_ATTRIBUTES');
		vixen.createMenuItems('edit-popup-xul-events', 'XUL_EVENTS');
		vixen.createMenuItems('edit-popup-php-c-scheme', 'C_SCHEME');
		vixen.createMenuItems('edit-popup-j-query', 'J_QUERY');

		vixen.createMenuItems('edit-popup-php-a', 'PHP_A');
		vixen.createMenuItems('edit-popup-php-b', 'PHP_B');
		vixen.createMenuItems('edit-popup-php-c', 'PHP_C');
		vixen.createMenuItems('edit-popup-php-d', 'PHP_D');
		vixen.createMenuItems('edit-popup-php-e', 'PHP_E');
		vixen.createMenuItems('edit-popup-php-f', 'PHP_F');
		vixen.createMenuItems('edit-popup-php-g', 'PHP_G');
		vixen.createMenuItems('edit-popup-php-h', 'PHP_H');
		vixen.createMenuItems('edit-popup-php-i', 'PHP_I');
		vixen.createMenuItems('edit-popup-php-j', 'PHP_J');
		vixen.createMenuItems('edit-popup-php-k', 'PHP_K');
		vixen.createMenuItems('edit-popup-php-l', 'PHP_L');
		vixen.createMenuItems('edit-popup-php-m', 'PHP_M');
		vixen.createMenuItems('edit-popup-php-n', 'PHP_N');
		vixen.createMenuItems('edit-popup-php-o', 'PHP_O');
		vixen.createMenuItems('edit-popup-php-p', 'PHP_P');
		vixen.createMenuItems('edit-popup-php-q', 'PHP_Q');
		vixen.createMenuItems('edit-popup-php-r', 'PHP_R');
		vixen.createMenuItems('edit-popup-php-s', 'PHP_S');
		vixen.createMenuItems('edit-popup-php-t', 'PHP_T');
		vixen.createMenuItems('edit-popup-php-u', 'PHP_U');
		vixen.createMenuItems('edit-popup-php-v', 'PHP_V');
		vixen.createMenuItems('edit-popup-php-w', 'PHP_W');
		vixen.createMenuItems('edit-popup-php-x', 'PHP_X');
		vixen.createMenuItems('edit-popup-php-z', 'PHP_Z');
		vixen.readconsole(0);
		vixen.filebrowser('home');
      
        vixen.polling();
	},

	shutdown: function () {
		try {
			window.removeEventListener('keypress', vixen.trigger, false);
		} catch(e) {
			// whatever..
		}
		try {
			service.unregisterListener(this.ConsoleListener);
			vixen = null;
			window.close();
		} catch(e) {}
	}
};

window.updateTabsStat = function () {
	vixen.updateTabStatus('document-tabs');
}

window.addEventListener("load", function () {
	window.addEventListener('keypress', vixen.trigger, true);
}, false);
