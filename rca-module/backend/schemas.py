
from typing import Optional
from pydantic import BaseModel, field_validator

# ── Single source of truth for form field keys ────────────────────────────────
FORM_FIELD_KEYS = [
    # Identification
    "investigation_id",
    "title",
    "incident_classification",  # Minor / Major / Critical
    "severity",                 # Low / Medium / High / Critical
    "product_name",
    "batch_number",
    "manufacturing_stage",
    "equipment_id",
    "equipment_status",
    "area_location",
    "department",

    # Dates & detection
    "incident_date",
    "date_detected",
    "detected_by",
    "detection_method",

    # Incident narrative
    "incident_description",
    "expected_specification",
    "actual_observation",
    "containment_action",

    # Impact
    "product_impact",
    "patient_safety_impact",

    # Additional context
    "raw_material_info",
    "process_parameters",
    "operator_shift_info",
    "available_evidence",
    "previous_incidents",
]

_EMPTY_WORDS = {
    "", "n/a", "na", "none", "null", "unknown", "not mentioned",
    "not provided", "not stated", "not specified", "-",
}

_CLASSIFICATION_VALUES = ("Minor", "Major", "Critical")
_SEVERITY_VALUES       = ("Low", "Medium", "High", "Critical")


class RCAFormFields(BaseModel):
    # Identification
    investigation_id:       Optional[str] = None
    title:                  Optional[str] = None
    incident_classification: Optional[str] = None
    severity:               Optional[str] = None
    product_name:           Optional[str] = None
    batch_number:           Optional[str] = None
    manufacturing_stage:    Optional[str] = None
    equipment_id:           Optional[str] = None
    equipment_status:       Optional[str] = None
    area_location:          Optional[str] = None
    department:             Optional[str] = None

    # Dates & detection
    incident_date:          Optional[str] = None
    date_detected:          Optional[str] = None
    detected_by:            Optional[str] = None
    detection_method:       Optional[str] = None

    # Incident narrative
    incident_description:   Optional[str] = None
    expected_specification: Optional[str] = None
    actual_observation:     Optional[str] = None
    containment_action:     Optional[str] = None

    # Impact
    product_impact:         Optional[str] = None
    patient_safety_impact:  Optional[str] = None

    # Additional context
    raw_material_info:      Optional[str] = None
    process_parameters:     Optional[str] = None
    operator_shift_info:    Optional[str] = None
    available_evidence:     Optional[str] = None
    previous_incidents:     Optional[str] = None

    @field_validator("*", mode="before")
    @classmethod
    def tidy(cls, value):
        """Normalise 'N/A', 'unknown', empty strings, etc. to None."""
        if value is None:
            return None
        if isinstance(value, (list, tuple)):
            value = "; ".join(str(v) for v in value)
        value = str(value).strip()
        return None if value.lower() in _EMPTY_WORDS else value

    @field_validator("incident_classification")
    @classmethod
    def valid_classification(cls, value):
        if value is None:
            return None
        for allowed in _CLASSIFICATION_VALUES:
            if value.strip().lower() == allowed.lower():
                return allowed
        return None

    @field_validator("severity")
    @classmethod
    def valid_severity(cls, value):
        if value is None:
            return None
        for allowed in _SEVERITY_VALUES:
            if value.strip().lower() == allowed.lower():
                return allowed
        return None
