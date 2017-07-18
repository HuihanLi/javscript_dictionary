//first, create the viz
$(document).ready(function initViz() {

  var vizDiv = document.getElementById("vizDiv"),
    url = "https://public.tableau.com/views/getData_Demo_0/getData_Demo?:embed=y&:display_count=yes&publish=yes",

    options = {

      hideToolbar: true,
      onFirstInteractive: function() {

        workbook = viz.getWorkbook();
        dash = viz.getWorkbook().getActiveSheet();
        workbook.activateSheetAsync(dash)
          .then(function(dashboard) {
            //this is the secret sauce that stores all of the sheet names on the dashboard in an array named sheetNames
            var worksheets = dashboard.getWorksheets();
            //here is the aforementioned array
            var sheetNames = [];
            //here we are looping through all the sheets on the dash, & pushing the sheet name to the sheetNames array
            for (var i = 0, len = worksheets.length; i < len; i++) {

              var sheet = worksheets[i];
              sheetNames.push(sheet.getName());
            }

            //here is where we are creating our dropdown menu... kind of like a Tableau parameter
            //we will inject this value into the getVizData() function a little bit later
            var sel = document.getElementById('SheetList');
            var fragment = document.createDocumentFragment();
            sheetNames.forEach(function(sheetName, index) {

              var opt = document.createElement('option');
              opt.innerHTML = sheetName;
              opt.value = sheetName;
              fragment.appendChild(opt);
            });

            sel.appendChild(fragment);

          });
      }
    };
  viz = new tableau.Viz(vizDiv, url, options);
});

//if you've made it to this point, know that the magic came from here: https://www.interworks.com/blog/rrouse/2016/06/07/pull-viz-data-new-javascript-api-features-tableau-10
function getVizData() {
  options = {

    maxRows: 0, // Max rows to return. Use 0 to return all rows
    ignoreAliases: false,
    ignoreSelection: true,
    includeAllColumns: false
  };

  sheet = viz.getWorkbook().getActiveSheet();

  //if active tab is a worksheet, get data from that sheet
  if (sheet.getSheetType() === 'worksheet') {
    sheet.getUnderlyingDataAsync(options).then(function(t) {
      buildMenu(t);
    });

    //if active sheet is a dashboard get data from a specified sheet
  } else {
    worksheetArray = viz.getWorkbook().getActiveSheet().getWorksheets();
    for (var i = 0; i < worksheetArray.length; i++) {
      worksheet = worksheetArray[i];
      sheetName = worksheet.getName();

      //get user's selection from dropdown of sheets
      var selectedVal = document.getElementById("SheetList").value;

      //get the data from the selected sheet
      if (sheetName == selectedVal) {
        worksheetArray[i].getSummaryDataAsync(options).then(function(t) {
          buildMenu(t);
        });
      }
    }
  }
}

//restructure the data and build something with it
function buildMenu(table) {

  //the data returned from the tableau API
  var columns = table.getColumns();
  var data = table.getData();

  //convert to field:values convention
  function reduceToObjects(cols, data) {
    var fieldNameMap = $.map(cols, function(col) {
      return col.$impl.$fieldName;
    });
    var dataToReturn = $.map(data, function(d) {
      return d.reduce(function(memo, value, idx) {
        memo[fieldNameMap[idx]] = value.value;
        return memo;
      }, {});
    });
    return dataToReturn;
  }

  var niceData = reduceToObjects(columns, data);

  //take the niceData and send it to a csv named TableauDataExport
  alasql("SELECT * INTO CSV('TableauDataExport.csv',{headers:true}) FROM ?", [niceData]);

}