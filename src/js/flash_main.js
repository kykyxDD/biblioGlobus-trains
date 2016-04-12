function insert_flash()
{
    var get_params = {}
    //var BASE_URL = ""
    
    var parts = location.href.split("?")
    if (parts.length > 1) {
        var pairs = parts[1].split("&")
        for (var i=0; i<pairs.length; i++) {
            var pair = pairs[i].split("=")
            get_params[pair[0]] = pair[1]	
        }
    }

    var url = BASE_URL + "train.swf"
    var swfVersionStr = "10.3.0";
    var xiSwfUrlStr = "";
    var flashvars = {}
    flashvars.demo_mode = "demo" in get_params ? get_params.demo : null;
    flashvars.view_mode = "tourid" in get_params ? get_params.tourid == 'SEATMAP' : null;
    flashvars.seats_info_url = escape(SEATS_INFO_URL) || "trs.xml?" // - откуда загружается xml
    flashvars.seat_request = escape(SEAT_REQUEST) || "trs.xml?" // - куда шлется запрос
    
    var params = {};
    params.quality = "high";
    params.bgcolor = "#ffffff";
    params.play = "true";
    params.loop = "true";
    params.wmode = "window";
    params.scale = "noscale";
    params.menu = "false";
    params.devicefont = "false";
    params.salign = "";
    params.base = BASE_URL
    params.allowscriptaccess = "sameDomain";
    params.allowFullScreen = "true";
    
    var attributes = {};
    attributes.id = "registration";
    attributes.name = "registration";
    attributes.align = "middle";
    swfobject.createCSS("html", "height:100%; background-color: #ffffff;");
    swfobject.createCSS("#flash_cont", "height:100%;");
    swfobject.createCSS("body", "margin:0; padding:0; overflow:hidden; height:100%;");
    
    swfobject.embedSWF(
        url,
        "flash_cont",
        "100%",
        "100%",
        swfVersionStr,
        xiSwfUrlStr,
        flashvars,
        params,
        attributes
    );
}

var f = function() {
	document.body.style.display = 'block'
	document.body.innerHTML = "<div id='flash_cont'></div>"
	setTimeout(insert_flash, 100)
}

window.onload = f;
