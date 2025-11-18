from datetime import datetime, date, time

from contextlib import contextmanager
import bcrypt
from secrets import token_urlsafe

from sqlalchemy import (
    create_engine,
    Column,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Integer,
    String,
    LargeBinary,
    UniqueConstraint,
    or_, 
    and_,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# -----------------------------------------------------------------------
# DATABASE CONFIG
# -----------------------------------------------------------------------

DB_USER = "eventease"
DB_PASS = "eventease"
DB_HOST = "10.0.0.2"
DB_PORT = 5432
DB_NAME = "eventeasedb"

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL, echo=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

# -----------------------------------------------------------------------
# MODELS
# -----------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(LargeBinary(60), nullable=False)

    calendar_token = Column(String(64), unique=True, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(512), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint("owner_id", "name", name="uq_team_owner_name"),
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True)
    team_id = Column(
        Integer,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )
    role = Column(String(50), nullable=False, default="member")

    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_members_team_user"),
    )


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    owner_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )

    title = Column(String(200), nullable=False)
    description = Column(String, nullable=True)
    location = Column(String(255), nullable=True)
    event_url = Column(String(500), nullable=True)

    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    endtime = Column(Time, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class EventInvitation(Base):
    __tablename__ = "event_invitations"

    id = Column(Integer, primary_key=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )

    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_invitations_event_user"),
    )


class EventInvitesTeam(Base):
    __tablename__ = "event_teams"

    id = Column(Integer, primary_key=True)
    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )
    team_id = Column(
        Integer,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )

    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("event_id", "team_id", name="uq_event_teams_event_team"),
    )


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )
    contact_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,           # added
    )

    status = Column(String(20), nullable=False, default="pending")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "contact_id", name="uq_user_contacts_user_contact"),
    )

# -----------------------------------------------------------------------
# SESSION HANDLING
# -----------------------------------------------------------------------

def get_session():
    db = SessionLocal()
    try:
        yield db
        db.commit()       # ⬅️ commit automático al final de la request
    except:
        db.rollback()
        raise
    finally:
        db.close()



@contextmanager
def get_session_cm():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()


# -----------------------------------------------------------------------
# DB CONTROL
# -----------------------------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)

def reset_db():
    Base.metadata.drop_all(bind=engine)   # borra todas las tablas



# -----------------------------------------------------------------------
# CALENDAR TOKEN & EVENTS FOR CALENDAR
# -----------------------------------------------------------------------

def get_or_create_calendar_token(db: Session, user_id: int) -> str:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError("User not found")

    if user.calendar_token:
        return user.calendar_token

    user.calendar_token = token_urlsafe(32)
    db.add(user)
    db.flush()
    db.refresh(user)
    return user.calendar_token


def get_user_by_calendar_token(db: Session, token: str) -> User | None:
    return db.query(User).filter(User.calendar_token == token).first()


def list_events_for_calendar(db: Session, user_id: int) -> list[Event]:
    owned = list_events_by_owner(db, owner_id=user_id)
    invitations = list_events_user_is_invited_to(db, user_id=user_id)

    events: list[Event] = []
    seen_ids: set[int] = set()

    # Eventos creados
    for ev in owned:
        if ev.id not in seen_ids:
            events.append(ev)
            seen_ids.add(ev.id)

    # Invitaciones aceptadas
    for inv in invitations:
        if inv.status != "accepted":
            continue
        ev = db.query(Event).filter(Event.id == inv.event_id).first()
        if not ev:
            continue
        if ev.id not in seen_ids:
            events.append(ev)
            seen_ids.add(ev.id)

    return events

# -----------------------------------------------------------------------
# ICS GENERATION
# -----------------------------------------------------------------------

def _combine_date_time(d: date, t: time | None) -> datetime:
    if t is None:
        t = time(0, 0)
    # "Floating time" sin zona: Google lo interpreta según la zona del calendario
    return datetime(d.year, d.month, d.day, t.hour, t.minute, t.second)


def _format_dt(dt: datetime) -> str:
    """
    Formato ICS sin zona: YYYYMMDDTHHMMSS
    """
    return dt.strftime("%Y%m%dT%H%M%S")


def _escape_ics(text: str | None) -> str:
    if not text:
        return ""
    return (
        text.replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\n", "\\n")
    )


def generate_ics_for_events(events: list[Event]) -> str:
    now_str = datetime.utcnow().strftime("%Y%m%dT%H%M%S")

    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EventEase//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for ev in events:
        start_dt = _combine_date_time(ev.date, ev.time)

        if ev.endtime is not None:
            end_dt = _combine_date_time(ev.date, ev.endtime)
        else:
            # por defecto +1h
            end_dt = start_dt.replace(hour=start_dt.hour + 1)

        uid = f"eventease-{ev.id}@eventease"

        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{uid}")
        lines.append(f"DTSTAMP:{now_str}")
        lines.append(f"DTSTART:{_format_dt(start_dt)}")
        lines.append(f"DTEND:{_format_dt(end_dt)}")
        lines.append(f"SUMMARY:{_escape_ics(ev.title)}")

        if ev.description:
            lines.append(f"DESCRIPTION:{_escape_ics(ev.description)}")
        if ev.location:
            lines.append(f"LOCATION:{_escape_ics(ev.location)}")

        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


# -----------------------------------------------------------------------
# HELPERS
# -----------------------------------------------------------------------

def hash_password(plain_password: str) -> bytes:
    """Hash a plain password using bcrypt."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())

def _generate_event_url() -> str:
    token = token_urlsafe(16)
    return f"/invite/{token}"


def search_user_contacts_by_query(db: Session, user_id: int, query: str) -> list[User]:
    if not query:
        return []

    q_like = f"%{query.lower()}%"

    rows = (
        db.query(User)
        .join(Contact, Contact.contact_id == User.id)
        .filter(
            Contact.user_id == user_id,
            Contact.status == "accepted",
            or_(
                User.name.ilike(q_like),
                User.email.ilike(q_like),
            ),
        )
        .limit(20)
        .all()
    )
    return rows


def search_user_teams_by_query(db: Session, user_id: int, query: str) -> list[Team]:
    if not query:
        return []

    q_like = f"%{query.lower()}%"

    owned = (
        db.query(Team)
        .filter(
            Team.owner_id == user_id,
            Team.name.ilike(q_like),
        )
        .all()
    )

    member_of = (
        db.query(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .filter(
            TeamMember.user_id == user_id,
            TeamMember.status == "accepted",
            Team.name.ilike(q_like),
        )
        .all()
    )

    merged: dict[int, Team] = {}
    for t in owned + member_of:
        merged[t.id] = t

    return list(merged.values())


def invite_team_and_members_to_event(db: Session, event_id: int, team_id: int):
    # 1) Registrar la invitación al equipo (si ya existía lanza ValueError)
    evt_team = invite_team_to_event(db, event_id=event_id, team_id=team_id)

    # 2) Auto-invitar a los miembros (esta función YA evita duplicados por usuario)
    created_invites = auto_invite_team_members(db, event_id=event_id, team_id=team_id)

    return evt_team, created_invites

# -----------------------------------------------------------------------
# USER FUNCTIONS
# -----------------------------------------------------------------------
def create_user(db: Session, name: str, email: str, password: str) -> User:

    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise ValueError("Email is already registered")

    password_hash = hash_password(password)

    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        calendar_token=token_urlsafe(32), 
    )

    db.add(user)
    db.flush()   # get auto-generated id
    db.refresh(user)

    return user

def verify_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise ValueError("Invalid email or password")

    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash):
        raise ValueError("Invalid email or password")

    return user

def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


# -----------------------------------------------------------------------
# TEAM FUNCTIONS
# -----------------------------------------------------------------------

def create_team(db: Session, owner_id: int, name: str, description: str | None = None) -> Team:
    # Ensure owner exists
    owner = db.query(User).filter(User.id == owner_id).first()
    if owner is None:
        raise ValueError("Owner user does not exist")

    # Name must be unique per owner
    existing = db.query(Team).filter(
        Team.owner_id == owner_id,
        Team.name == name
    ).first()

    if existing:
        raise ValueError("Team name already exists")

    team = Team(
        owner_id=owner_id,
        name=name,
        description=description,
    )

    db.add(team)
    db.flush()
    db.refresh(team)

    # 🔹 Auto-add owner as accepted member of the team
    owner_membership = TeamMember(
        team_id=team.id,
        user_id=owner_id,
        role="owner",      # or "admin" if you prefer
        status="accepted",
    )
    db.add(owner_membership)
    db.flush()

    return team

def get_team_by_id(db: Session, team_id: int) -> Team | None:
    return db.query(Team).filter(Team.id == team_id).first()

def update_team(db: Session, team_id: int, name: str | None = None, description: str | None = None) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise ValueError("Team not found")

    if name is not None:
        # Check for duplicate name
        existing = db.query(Team).filter(
        Team.owner_id == team.owner_id,
        Team.name == name,
        Team.id != team_id
        ).first()

        if existing:
            raise ValueError("Team name already exists")
        team.name = name

    if description is not None:
        team.description = description

    db.flush()
    db.refresh(team)
    return team

def delete_team(db: Session, team_id: int) -> None:
    team = db.query(Team).filter(Team.id == team_id).first()
    if team is None:
        raise ValueError("Team not found")

    db.delete(team)

# -----------------------------------------------------------------------
# TEAM MEMBERS FUNCTIONS
# -----------------------------------------------------------------------

def list_pending_team_invites(db: Session, user_id: int):
    return db.query(TeamMember).filter(
        TeamMember.user_id == user_id,
        TeamMember.status == "pending",
    ).all()


def invite_user_to_team(db: Session, team_id: int, user_id: int, role: str = "member") -> TeamMember:
    # Check if membership already exists
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if existing:
        raise ValueError("User already invited or already in the team")

    member = TeamMember(
        team_id=team_id,
        user_id=user_id,
        role=role,
        status="pending",
    )

    db.add(member)
    db.flush()
    db.refresh(member)

    return member

def accept_team_invite(db: Session, team_id: int, user_id: int) -> TeamMember:
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if member is None or member.status != "pending":
        raise ValueError("No pending invitation found")

    member.status = "accepted"

    db.flush()
    db.refresh(member)
    return member

def reject_team_invite(db: Session, team_id: int, user_id: int) -> None:
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if member is None or member.status != "pending":
        raise ValueError("No pending invitation found")

    member.status = "rejected"

    db.flush()

def remove_user_from_team(db: Session, team_id: int, user_id: int) -> None:
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if member is None:
        raise ValueError("User is not in this team")

    db.delete(member)

def list_teams_created_by_user(db: Session, owner_id: int) -> list[Team]:
    return (
        db.query(Team)
        .filter(Team.owner_id == owner_id)
        .all()
    )


def list_teams_user_is_in(db: Session, user_id: int) -> list[Team]:
    return (
        db.query(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .filter(
            TeamMember.user_id == user_id,
            TeamMember.status == "accepted",
        )
        .all()
    )

def list_team_members(db: Session, team_id: int):
    return db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.status == "accepted"
    ).all()

# -----------------------------------------------------------------------
# EVENT FUNCTIONS
# -----------------------------------------------------------------------
def create_event(
    db: Session,
    owner_id: int,
    title: str,
    description: str | None,
    location: str | None,
    date: Date,
    time: Time,
    endtime: Time | None,
    event_url: str | None = None,   
) -> Event:
    # Ensure owner exists
    owner = db.query(User).filter(User.id == owner_id).first()
    if owner is None:
        raise ValueError("Owner user does not exist")

    # Si no nos pasan un event_url, lo generamos aquí
    if event_url is None:
        event_url = _generate_event_url()

    event = Event(
        owner_id=owner_id,
        title=title,
        description=description,
        location=location,
        event_url=event_url,
        date=date,
        time=time,
        endtime=endtime,
    )

    db.add(event)
    db.flush()
    db.refresh(event)

    return event


def get_event_by_id(db: Session, event_id: int) -> Event | None:
    return db.query(Event).filter(Event.id == event_id).first()

def update_event(
    db: Session,
    event_id: int,
    title: str | None = None,
    description: str | None = None,
    location: str | None = None,
    event_url: str | None = None,
    date: Date | None = None,
    time: Time | None = None,
    endtime: Time | None = None,
) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise ValueError("Event not found")

    if title is not None:
        event.title = title

    if description is not None:
        event.description = description

    if location is not None:
        event.location = location

    if event_url is not None:
        event.event_url = event_url

    if date is not None:
        event.date = date

    if time is not None:
        event.time = time

    if endtime is not None:
        event.endtime = endtime

    db.flush()
    db.refresh(event)
    return event

def delete_event(db: Session, event_id: int) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise ValueError("Event not found")

    db.delete(event)


def list_events_by_owner(db: Session, owner_id: int):
    return db.query(Event).filter(Event.owner_id == owner_id).all()

def get_event_url(db: Session, event_id: int) -> str | None:
    """
    Return the event URL if it exists.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise ValueError("Event not found")

    return event.event_url

# -----------------------------------------------------------------------
# EVENT INVITATION FUNCTIONS
# -----------------------------------------------------------------------

def invite_user_to_event(db: Session, event_id: int, user_id: int) -> EventInvitation:
    # Prevent duplicates
    existing = db.query(EventInvitation).filter(
        EventInvitation.event_id == event_id,
        EventInvitation.user_id == user_id
    ).first()

    if existing:
        raise ValueError("User already invited to this event")

    invitation = EventInvitation(
        event_id=event_id,
        user_id=user_id,
        status="pending",
    )

    db.add(invitation)
    db.flush()
    db.refresh(invitation)

    return invitation

def accept_event_invite(db: Session, event_id: int, user_id: int) -> EventInvitation:
    invitation = db.query(EventInvitation).filter(
        EventInvitation.event_id == event_id,
        EventInvitation.user_id == user_id
    ).first()

    if invitation is None or invitation.status != "pending":
        raise ValueError("No pending invitation found")

    invitation.status = "accepted"

    db.flush()
    db.refresh(invitation)
    return invitation

def reject_event_invite(db: Session, event_id: int, user_id: int) -> None:
    invitation = db.query(EventInvitation).filter(
        EventInvitation.event_id == event_id,
        EventInvitation.user_id == user_id
    ).first()

    if invitation is None or invitation.status != "pending":
        raise ValueError("No pending invitation found")

    invitation.status = "rejected"

    db.flush()

def list_events_user_is_invited_to(db: Session, user_id: int):
    return db.query(EventInvitation).filter(
        EventInvitation.user_id == user_id
    ).all()

def list_all_invited_users_for_event(db: Session, event_id: int):
    return db.query(EventInvitation).filter(
        EventInvitation.event_id == event_id
    ).all()

# -----------------------------------------------------------------------
# EVENT TEAM INVITATION FUNCTIONS
# -----------------------------------------------------------------------

def invite_team_to_event(db: Session, event_id: int, team_id: int) -> EventInvitesTeam:
    existing = db.query(EventInvitesTeam).filter(
        EventInvitesTeam.event_id == event_id,
        EventInvitesTeam.team_id == team_id
    ).first()

    if existing:
        raise ValueError("Team already invited to this event")

    invite = EventInvitesTeam(
        event_id=event_id,
        team_id=team_id,
        status="pending"
    )

    db.add(invite)
    db.flush()
    db.refresh(invite)

    return invite

def accept_team_event_invite(db: Session, event_id: int, team_id: int) -> EventInvitesTeam:
    invite = db.query(EventInvitesTeam).filter(
        EventInvitesTeam.event_id == event_id,
        EventInvitesTeam.team_id == team_id
    ).first()

    if invite is None or invite.status != "pending":
        raise ValueError("No pending invite found")

    invite.status = "accepted"

    db.flush()
    db.refresh(invite)

    return invite

def reject_team_event_invite(db: Session, event_id: int, team_id: int) -> None:
    invite = db.query(EventInvitesTeam).filter(
        EventInvitesTeam.event_id == event_id,
        EventInvitesTeam.team_id == team_id
    ).first()

    if invite is None or invite.status != "pending":
        raise ValueError("No pending invite found")

    invite.status = "rejected"

    db.flush()

def cancel_team_event_invite(db: Session, event_id: int, team_id: int) -> None:
    invite = db.query(EventInvitesTeam).filter(
        EventInvitesTeam.event_id == event_id,
        EventInvitesTeam.team_id == team_id
    ).first()

    if invite is None:
        raise ValueError("Team is not invited to this event")

    db.delete(invite)

def list_teams_invited_to_event(db: Session, event_id: int):
    return db.query(EventInvitesTeam).filter(
        EventInvitesTeam.event_id == event_id
    ).all()

def auto_invite_team_members(db: Session, event_id: int, team_id: int):
    # Get all accepted team members
    members = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.status == "accepted"
    ).all()

    created = []

    for member in members:
        # Avoid duplicate invites
        existing = db.query(EventInvitation).filter(
            EventInvitation.event_id == event_id,
            EventInvitation.user_id == member.user_id
        ).first()

        if existing:
            continue  # skip if already invited

        invite = EventInvitation(
            event_id=event_id,
            user_id=member.user_id,
            status="pending"
        )

        db.add(invite)
        db.flush()
        db.refresh(invite)

        created.append(invite)

    return created

# -----------------------------------------------------------------------
# CONTACT FUNCTIONS
# -----------------------------------------------------------------------


def send_contact_request(db: Session, user_id: int, contact_id: int) -> Contact:
    if user_id == contact_id:
        raise ValueError("Cannot add yourself as a contact")

    # ¿Ya existe relación en cualquier dirección?
    existing = db.query(Contact).filter(
        or_(
            and_(Contact.user_id == user_id, Contact.contact_id == contact_id),
            and_(Contact.user_id == contact_id, Contact.contact_id == user_id),
        )
    ).first()

    if existing:
        raise ValueError("Contact request already exists")

    request = Contact(
        user_id=user_id,
        contact_id=contact_id,
        status="pending",
    )

    db.add(request)
    db.flush()
    db.refresh(request)

    return request


def accept_contact_request(db: Session, user_id: int, contact_id: int) -> Contact:
    request = db.query(Contact).filter(
        Contact.user_id == user_id,
        Contact.contact_id == contact_id,
        Contact.status == "pending",
    ).first()

    if request is None:
        raise ValueError("No pending request found")

    # Marcamos como aceptada
    request.status = "accepted"

    # Creamos la relación inversa aceptada si no existe
    reverse = db.query(Contact).filter(
        Contact.user_id == contact_id,
        Contact.contact_id == user_id,
    ).first()

    if reverse is None:
        reverse = Contact(
            user_id=contact_id,
            contact_id=user_id,
            status="accepted",
        )
        db.add(reverse)

    db.flush()
    db.refresh(request)

    return request


def reject_contact_request(db: Session, user_id: int, contact_id: int) -> None:
    request = db.query(Contact).filter(
        Contact.user_id == user_id,
        Contact.contact_id == contact_id,
        Contact.status == "pending",
    ).first()

    if request is None:
        raise ValueError("No pending request found")

    request.status = "rejected"
    db.flush()


def remove_contact(db: Session, user_id: int, contact_id: int) -> None:
    entries = db.query(Contact).filter(
        or_(
            and_(Contact.user_id == user_id, Contact.contact_id == contact_id),
            and_(Contact.user_id == contact_id, Contact.contact_id == user_id),
        )
    ).all()

    if not entries:
        raise ValueError("Contact relationship does not exist")

    for entry in entries:
        db.delete(entry)


def list_contacts(db: Session, user_id: int):
    return db.query(Contact).filter(
        Contact.user_id == user_id,
        Contact.status == "accepted",
    ).all()


def list_pending_received_requests(db: Session, user_id: int):
    return db.query(Contact).filter(
        Contact.contact_id == user_id,
        Contact.status == "pending",
    ).all()


# -----------------------------------------------------------------------
# DB MAIN
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# DEMO SEED DATA (traducción de initialEvents / initialInvites)
# -----------------------------------------------------------------------

RSVP_TO_STATUS = {
    "pending": "pending",
    "confirmed": "accepted",
    "rejected": "rejected",
}

initial_events = [
    {
        "title": "Reunión de kickoff Q4",
        "date": "2025-10-14",
        "time": "09:30",
        "location": "Sala 1A",
        "description": "Definición de objetivos y responsabilidades del nuevo trimestre. Se revisarán métricas del Q3.",
        "invitees": [
            {"name": "Ana", "email": "ana@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Luis", "email": "luis@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Sofía", "email": "sofia@ejemplo.com", "rsvp": "pending"},
            {"name": "Carlos", "email": "carlos@ejemplo.com", "rsvp": "rejected"},
            {"name": "Valeria", "email": "valeria@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Tomás", "email": "tomas@ejemplo.com", "rsvp": "pending"},
            {"name": "Lucía", "email": "lucia@ejemplo.com", "rsvp": "confirmed"},
        ],
    },
    {
        "title": "Observación astronómica",
        "date": "2025-10-18",
        "time": "20:30",
        "location": "Mirador Cerro Alto",
        "description": "Noche despejada, se llevará telescopio y cámara. Revisaremos constelaciones visibles y exposición larga.",
        "invitees": [
            {"name": "Héctor", "email": "hector@ejemplo.com", "rsvp": "confirmed"},
            {"name": "María", "email": "maria@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Esteban", "email": "esteban@ejemplo.com", "rsvp": "pending"},
            {"name": "Camila", "email": "camila@ejemplo.com", "rsvp": "pending"},
            {"name": "Andrea", "email": "andrea@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Pablo", "email": "pablo@ejemplo.com", "rsvp": "rejected"},
            {"name": "Rosa", "email": "rosa@ejemplo.com", "rsvp": "pending"},
        ],
    },
    {
        "title": "Entrega final de proyecto de Sistemas",
        "date": "2025-10-20",
        "time": "11:59",
        "location": "Campus Virtual",
        "description": "Subir PDF y repositorio antes del mediodía. Asegurarse de incluir README y pruebas unitarias.",
        "invitees": [
            {"name": "Laura", "email": "laura@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Ricardo", "email": "ricardo@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Juan", "email": "juan@ejemplo.com", "rsvp": "pending"},
            {"name": "Sara", "email": "sara@ejemplo.com", "rsvp": "pending"},
            {"name": "Elena", "email": "elena@ejemplo.com", "rsvp": "rejected"},
            {"name": "Mateo", "email": "mateo@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Diana", "email": "diana@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Hugo", "email": "hugo@ejemplo.com", "rsvp": "pending"},
        ],
    },
    {
        "title": "Cumpleaños de Valeria",
        "date": "2025-10-20",
        "time": "19:30",
        "location": "Casa de Valeria",
        "description": "Fiesta temática de los 2000s. Habrá karaoke, comida y bebidas. Se permite traer un invitado.",
        "invitees": [
            {"name": "Valeria", "email": "val@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Pablo", "email": "pablo@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Marina", "email": "marina@ejemplo.com", "rsvp": "pending"},
            {"name": "Héctor", "email": "hector@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Lucía", "email": "lucia@ejemplo.com", "rsvp": "rejected"},
            {"name": "Santiago", "email": "santiago@ejemplo.com", "rsvp": "pending"},
            {"name": "David", "email": "david@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Paola", "email": "paola@ejemplo.com", "rsvp": "confirmed"},
        ],
    },
    {
        "title": "Workshop: Rust y concurrencia",
        "date": "2025-10-23",
        "time": "16:00",
        "location": "Lab 3",
        "description": "Exploraremos el modelo async/await, Tokio y patrones de sincronización. Nivel intermedio.",
        "invitees": [
            {"name": "Mario", "email": "mario@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Iván", "email": "ivan@ejemplo.com", "rsvp": "pending"},
            {"name": "Laura", "email": "laura@ejemplo.com", "rsvp": "pending"},
            {"name": "César", "email": "cesar@ejemplo.com", "rsvp": "rejected"},
            {"name": "Antonia", "email": "antonia@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Rafael", "email": "rafael@ejemplo.com", "rsvp": "confirmed"},
        ],
    },
    {
        "title": "Hacknight universitaria",
        "date": "2025-11-01",
        "time": "18:00",
        "location": "Cowork — 2° piso",
        "description": "Sesión nocturna con retos de IA, mini hackathon y pizza libre hasta medianoche.",
        "invitees": [
            {"name": "Alejandro", "email": "ale@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Elena", "email": "elena@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Miguel", "email": "miguel@ejemplo.com", "rsvp": "pending"},
            {"name": "Sofía", "email": "sofia@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Camilo", "email": "camilo@ejemplo.com", "rsvp": "pending"},
            {"name": "Tania", "email": "tania@ejemplo.com", "rsvp": "rejected"},
            {"name": "Andrés", "email": "andres@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Nicolás", "email": "nico@ejemplo.com", "rsvp": "confirmed"},
        ],
    },
    {
        "title": "Retrospectiva sprint 42",
        "date": "2025-11-15",
        "time": "14:00",
        "location": "Sala 2B",
        "description": "Revisión de métricas, tiempos de entrega y sugerencias del equipo.",
        "invitees": [
            {"name": "Ana", "email": "ana@ejemplo.com", "rsvp": "pending"},
            {"name": "Luis", "email": "luis@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Sofía", "email": "sofia@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Valeria", "email": "valeria@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Carlos", "email": "carlos@ejemplo.com", "rsvp": "rejected"},
            {"name": "Martín", "email": "martin@ejemplo.com", "rsvp": "confirmed"},
        ],
    },
    {
        "title": "Retro del sprint 41",
        "date": "2025-09-25",
        "time": "15:00",
        "location": "Sala 2B",
        "description": "Revisión de aprendizajes y mejoras para próximos ciclos de desarrollo.",
        "invitees": [
            {"name": "Ana", "email": "ana@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Luis", "email": "luis@ejemplo.com", "rsvp": "pending"},
            {"name": "Pedro", "email": "pedro@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Diana", "email": "diana@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Gabriel", "email": "gabriel@ejemplo.com", "rsvp": "rejected"},
        ],
    },
    {
        "title": "Cena aniversario de la facultad",
        "date": "2025-10-05",
        "time": "20:00",
        "location": "Club Social Universitario",
        "description": "Cena formal de gala con profesores y egresados. Dress code: formal.",
        "invitees": [
            {"name": "Mónica", "email": "monica@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Camila", "email": "camila@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Jorge", "email": "jorge@ejemplo.com", "rsvp": "rejected"},
            {"name": "Sebastián", "email": "sebastian@ejemplo.com", "rsvp": "pending"},
            {"name": "Liliana", "email": "liliana@ejemplo.com", "rsvp": "confirmed"},
            {"name": "Oscar", "email": "oscar@ejemplo.com", "rsvp": "pending"},
        ],
    },
]

initial_invites = [
    {
        "title": "Revisión paper de IA",
        "date": "2025-09-20",
        "time": "17:00",
        "location": "Biblioteca — Sala 4",
        "host": "Carolina",
        "rsvp": "confirmed",
    },
    {
        "title": "Charla sobre observatorios amateurs",
        "date": "2025-10-08",
        "time": "18:30",
        "location": "Observatorio Municipal",
        "host": "Julián",
        "rsvp": "rejected",
    },
    {
        "title": "Asado del viernes",
        "date": "2025-10-11",
        "time": "19:00",
        "location": "Patio de Andrés",
        "host": "Andrés",
        "rsvp": "pending",
    },
    {
        "title": "Meetup Linux & Homelab",
        "date": "2025-10-25",
        "time": "15:30",
        "location": "Makerspace U.",
        "host": "Comunidad LUG",
        "rsvp": "confirmed",
    },
    {
        "title": "Workshop Docker avanzado",
        "date": "2025-10-26",
        "time": "10:00",
        "location": "Aula Magna",
        "host": "Paula",
        "rsvp": "pending",
    },
    {
        "title": "Concierto Oasis Tribute",
        "date": "2025-10-31",
        "time": "21:00",
        "location": "Teatro Central",
        "host": "Mateo",
        "rsvp": "confirmed",
    },
    {
        "title": "Fotografía nocturna urbana",
        "date": "2025-11-02",
        "time": "19:00",
        "location": "Puente del Río",
        "host": "Lucía",
        "rsvp": "pending",
    },
    {
        "title": "Reunión de cátedra",
        "date": "2025-09-30",
        "time": "11:00",
        "location": "Sala Zoom A",
        "host": "Profesor Ríos",
        "rsvp": "rejected",
    },
    {
        "title": "Café con el equipo",
        "date": "2025-10-19",
        "time": "09:00",
        "location": "Café Origen",
        "host": "Ana",
        "rsvp": "pending",
    },
    {
        "title": "Taller: Testing en Rust",
        "date": "2025-11-09",
        "time": "16:30",
        "location": "Lab 2",
        "host": "Diego",
        "rsvp": "confirmed",
    },
]


def get_or_create_user(db: Session, name: str, email: str, password: str = "demo1234") -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    return create_user(db, name=name, email=email, password=password)


def seed_demo_data():
    """Resetea la DB y la llena con eventos e invitaciones de prueba."""
    print("⚠️  Reseteando base de datos...")
    reset_db()
    print('si funcione')
    init_db()

    with get_session_cm() as db:
        # Usuario "actual" (el que verás al loguearte en el frontend)
        current_user = create_user(
            db,
            name="Demo User",
            email="demo@example.com",
            password="demo1234",
        )
        print("👤 Usuario demo:", current_user.id, current_user.email)

        # 1) Eventos creados por el usuario actual (equivalente a initialEvents)
        for ev in initial_events:
            event = create_event(
                db=db,
                owner_id=current_user.id,
                title=ev["title"],
                description=ev["description"],
                location=ev["location"],
                date=date.fromisoformat(ev["date"]),
                time=time.fromisoformat(ev["time"]),
                endtime=None,
            )

            print("📅 Evento creado:", event.id, event.title)

            # Invitados para ese evento
            for inv in ev["invitees"]:
                invited_user = get_or_create_user(
                    db,
                    name=inv["name"],
                    email=inv["email"],
                )

                status_str = RSVP_TO_STATUS[inv["rsvp"]]
                invitation = invite_user_to_event(db, event.id, invited_user.id)
                invitation.status = status_str  # ajustar de pending/accepted/rejected
                print(
                    "  ↳ Invitación:",
                    invited_user.email,
                    "=>",
                    status_str,
                )

        # 2) Eventos donde el usuario actual está invitado (equivalente a initialInvites)
        for inv_ev in initial_invites:
            # Crea un "host" para cada evento, si no existe
            host_email = f"{inv_ev['host'].lower().replace(' ', '_')}@ejemplo.com"
            host_user = get_or_create_user(
                db,
                name=inv_ev["host"],
                email=host_email,
            )

            event = create_event(
                db=db,
                owner_id=current_user.id,
                title=ev["title"],
                description=ev["description"],
                location=ev["location"],
                date=date.fromisoformat(ev["date"]),
                time=time.fromisoformat(ev["time"]),
                endtime=None,
            )


            status_str = RSVP_TO_STATUS[inv_ev["rsvp"]]
            invitation = invite_user_to_event(db, event.id, current_user.id)
            invitation.status = status_str

            print(
                "📨 Invitación para demo:",
                event.title,
                "host:",
                host_user.email,
                "status:",
                status_str,
            )

        print("✅ Seed de datos demo completado.")

def main():
    seed_demo_data()

if __name__ == "__main__":
    main()
