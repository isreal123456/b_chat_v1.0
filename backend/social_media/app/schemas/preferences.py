from pydantic import BaseModel, ConfigDict


class PreferencesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    likes: bool = True
    comments: bool = True
    follows: bool = True
    messages: bool = True
    email_notifications: bool = False
    private_account: bool = False
    show_activity: bool = True
    allow_tagging: bool = True


class PreferencesUpdate(PreferencesRead):
    pass
