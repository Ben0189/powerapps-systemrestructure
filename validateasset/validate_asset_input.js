function validateAsset(executionContext) {
    var formContext = executionContext.getFormContext();
    var lookupField = formContext.getAttribute("fgs_asset"); // Replace with actual lookup field name

    if (lookupField && lookupField.getValue()) {
        var selectedRecord = lookupField.getValue()[0]; // Get selected record details
        console.log("Selected Record:", selectedRecord);

        // Fetch related status from Web API
        Xrm.WebApi.retrieveRecord(selectedRecord.entityType, selectedRecord.id, "?$select=status")
            .then(function(result) {
                console.log("Status:", result.status);
                if (result.status !== "Operational") {
                    formContext.ui.setFormNotification(
                        `Warning: The selected asset has a status of ${result.status}.`,
                        "WARNING",
                        "statusWarning"
                    );
                } else {
                    formContext.ui.clearFormNotification("statusWarning");
                }
            })
            .catch(function(error) {
                console.error("Error retrieving asset status:", error);
            });
    } else {
        formContext.ui.clearFormNotification("statusWarning");
        console.log("No asset selected.");
    }
}
