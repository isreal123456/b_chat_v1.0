import Tag from '../ui/Tag'

export default function SkillsList({ skills = [] }) {
  return (
    <section className="panel stack">
      <h3>Skills</h3>
      <div className="tag-list">
        {skills.map((skill) => (
          <Tag key={skill}>{skill}</Tag>
        ))}
      </div>
    </section>
  )
}
