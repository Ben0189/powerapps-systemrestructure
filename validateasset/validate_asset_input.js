async function validateAsset(executionContext) {
    try {
        var formContext = executionContext.getFormContext();
        var lookupField = formContext.getAttribute("fgs_asset"); // Replace "fgs_asset" with your actual lookup field name

        if (lookupField && lookupField.getValue()) {
            var selectedRecord = lookupField.getValue()[0]; // Get selected record details
            console.log("Selected Record:", selectedRecord);

            // Fetch the asset status using Web API
            var result = await Xrm.WebApi.retrieveRecord(
                selectedRecord.entityType, // Logical name of the entity
                selectedRecord.id,         // GUID of the selected record
                "?$select=fgs_assetstatus" // Logical name of the status column
            );

            var statusValue = result.fgs_assetstatus; // Numeric value of the status
            console.log("Asset Status Value:", statusValue);

            // Map status values to labels
            var statusLabels = {
                795540000: "Operational",
                795540001: "Requires Attention",
                795540002: "Requires Repair",
                795540003: "Retired/Sold"
            };

            var statusLabel = statusLabels[statusValue] || "Unknown"; // Default to "Unknown"
            console.log("Asset Status Label:", statusLabel);

            // Notify user if the status is not "Operational"
            if (statusLabel !== "Operational") {
                formContext.ui.setFormNotification(
                    `Warning: The chosen asset is marked as "${statusLabel}" and not operational. Do you still want to proceed with its allocation?`,
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
