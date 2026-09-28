import re
from dataclasses import dataclass

@dataclass
class PIIEntity:
    value: str
    placeholder: str
    allowed_to_unmask: bool

class PIIHandler:
    def __init__(self, profile):
        self.entities = []
        if profile.email:
            self.entities.append(PIIEntity(profile.email, "[CONTACT_EMAIL]", True))
        # Hardcoding a dummy phone if it doesn't exist, just for architecture
        # In a real scenario, this would come from profile.phone
        self.entities.append(PIIEntity("+1234567890", "[CONTACT_PHONE]", False))

    def mask(self, text: str) -> str:
        if not text:
            return text
        masked_text = text
        for entity in self.entities:
            # Case insensitive replace
            pattern = re.compile(re.escape(entity.value), re.IGNORECASE)
            masked_text = pattern.sub(entity.placeholder, masked_text)
        return masked_text

    def unmask(self, text: str) -> str:
        if not text:
            return text
        unmasked_text = text
        for entity in self.entities:
            if entity.allowed_to_unmask:
                unmasked_text = unmasked_text.replace(entity.placeholder, entity.value)
            else:
                unmasked_text = unmasked_text.replace(entity.placeholder, "(Use the contact form)")
        return unmasked_text
