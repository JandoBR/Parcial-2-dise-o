# schemas.py
from datetime import date, time as dtime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict



class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TeamOut(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]

    class Config:
        orm_mode = True

class TeamInvitationOut(BaseModel):
    team_id: int
    role: str
    status: str
    team: TeamOut



class SimpleUserOut(BaseModel):
    id: int
    name: str | None = None
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)

class TeamMemberOut(BaseModel):
    id: int
    team_id: int
    role: str
    status: str
    user: SimpleUserOut

    class Config:
        orm_mode = True


class TeamInviteRequest(BaseModel):
    user_id: int  

class EventOut(BaseModel):
    id: int
    title: str
    date: date
    time: dtime
    endtime: Optional[dtime] = None
    location: Optional[str]
    description: Optional[str]
    event_url: Optional[str] = None
    invitees: List[dict] | list

    class Config:
        from_attributes = True



class InvitationOut(BaseModel):
    id: int
    title: str
    date: date
    time: Optional[dtime]
    endtime: Optional[dtime] = None
    location: Optional[str]
    host: Optional[str]
    rsvp: str

    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str
    date: date
    time: dtime                    
    endtime: dtime
    location: str | None = None
    description: str | None = None

    contact_ids: List[int] = []
    team_ids: List[int] = []

class UserSearchOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

class FriendRequestCreate(BaseModel):
    target_user_id: int

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class SimpleUserOut(BaseModel):
    id: int
    name: str | None = None
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class IncomingFriendRequestOut(BaseModel):
    id: int
    status: str
    from_user: SimpleUserOut

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict, EmailStr


class ContactOut(BaseModel):
    id: int
    status: str
    friend: SimpleUserOut

    model_config = ConfigDict(from_attributes=True)

class EventInviteUserRequest(BaseModel):
    user_id: int


class EventInviteTeamRequest(BaseModel):
    team_id: int
