async function validateAsset(executionContext) {
    try {
        var formContext = executionContext.getFormContext();
        var lookupField = formContext.getAttribute("fgs_asset"); // Replace "fgs_asset" with your actual lookup field name

        if (lookupField && lookupField.getValue()) {
            var selectedRecord = lookupField.getValue()[0]; // Get selected record details
            console.log("Selected Record:", selectedRecord);

            // Fetch related asset status using Web API
            var result = await Xrm.WebApi.retrieveRecord(
                selectedRecord.entityType, // Logical name of the entity
                selectedRecord.id,         // GUID of the selected record
                "?$select=fgs_assetstatus" // Use the actual logical name of the column
            );

            console.log("Asset Status:", result.fgs_assetstatus);

            // Check the status and display a warning if needed
            if (result.fgs_assetstatus !== "Operational") { // Update this based on your status value or label
                formContext.ui.setFormNotification(
                    `Warning: The selected asset has a status of "${result.fgs_assetstatus}".`,
                    "WARNING",
                    "statusWarning"
                );
            } else {
                formContext.ui.clearFormNotification("statusWarning");
            }
        } else {
            formContext.ui.clearFormNotification("statusWarning");
            console.log("No asset selected.");
        }
    } catch (error) {
        console.error("Error retrieving asset status:", error);
        formContext.ui.setFormNotification(
            "Error: Unable to validate asset status. Please try again.",
            "ERROR",
            "statusError"
        );
    }
}
