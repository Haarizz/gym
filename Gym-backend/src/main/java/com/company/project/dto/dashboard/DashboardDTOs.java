package com.company.project.dto.dashboard;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

public class DashboardDTOs {

    public static class GenericResponse<T> {
        private boolean success;
        private T data;

        public GenericResponse() {}
        public GenericResponse(boolean success, T data) {
            this.success = success;
            this.data = data;
        }
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public T getData() { return data; }
        public void setData(T data) { this.data = data; }
    }

    public static class KPIData {
        private BigDecimal revenue;
        private double revenueChange;
        private long activeMembers;
        private double membersChange;
        private long todayAttendance;
        private double attendanceChange;
        private long availableStaff;

        public BigDecimal getRevenue() { return revenue; }
        public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
        public double getRevenueChange() { return revenueChange; }
        public void setRevenueChange(double revenueChange) { this.revenueChange = revenueChange; }
        public long getActiveMembers() { return activeMembers; }
        public void setActiveMembers(long activeMembers) { this.activeMembers = activeMembers; }
        public double getMembersChange() { return membersChange; }
        public void setMembersChange(double membersChange) { this.membersChange = membersChange; }
        public long getTodayAttendance() { return todayAttendance; }
        public void setTodayAttendance(long todayAttendance) { this.todayAttendance = todayAttendance; }
        public double getAttendanceChange() { return attendanceChange; }
        public void setAttendanceChange(double attendanceChange) { this.attendanceChange = attendanceChange; }
        public long getAvailableStaff() { return availableStaff; }
        public void setAvailableStaff(long availableStaff) { this.availableStaff = availableStaff; }
    }

    public static class RevenueDataPoint {
        private String time;
        private BigDecimal revenue;
        private BigDecimal target;

        public RevenueDataPoint(String time, BigDecimal revenue, BigDecimal target) {
            this.time = time;
            this.revenue = revenue;
            this.target = target;
        }

        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }
        public BigDecimal getRevenue() { return revenue; }
        public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
        public BigDecimal getTarget() { return target; }
        public void setTarget(BigDecimal target) { this.target = target; }
    }

    public static class MembershipDistribution {
        private String name;
        private long value;
        private String color;
        private BigDecimal amount;

        public MembershipDistribution(String name, long value, String color, BigDecimal amount) {
            this.name = name;
            this.value = value;
            this.color = color;
            this.amount = amount;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public long getValue() { return value; }
        public void setValue(long value) { this.value = value; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }

    public static class ClassAttendance {
        @JsonProperty("class")
        private String className;
        private int capacity;
        private int attended;
        private int percentage;

        public ClassAttendance(String className, int capacity, int attended, int percentage) {
            this.className = className;
            this.capacity = capacity;
            this.attended = attended;
            this.percentage = percentage;
        }

        public String getClassName() { return className; }
        public void setClassName(String className) { this.className = className; }
        public int getCapacity() { return capacity; }
        public void setCapacity(int capacity) { this.capacity = capacity; }
        public int getAttended() { return attended; }
        public void setAttended(int attended) { this.attended = attended; }
        public int getPercentage() { return percentage; }
        public void setPercentage(int percentage) { this.percentage = percentage; }
    }

    public static class DashboardMember {
        private String id;
        private String name;
        private String email;
        private String phone;
        private String membershipType;
        private String joinDate;
        private String status;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getMembershipType() { return membershipType; }
        public void setMembershipType(String membershipType) { this.membershipType = membershipType; }
        public String getJoinDate() { return joinDate; }
        public void setJoinDate(String joinDate) { this.joinDate = joinDate; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class SalesPipeline {
        private String status;
        private long count;
        private String color;

        public SalesPipeline(String status, long count, String color) {
            this.status = status;
            this.count = count;
            this.color = color;
        }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
    }

    public static class PendingTask {
        private String id;
        private String leadName;
        private String type;
        private String dueDate;
        private String priority;
        private String subject;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getLeadName() { return leadName; }
        public void setLeadName(String leadName) { this.leadName = leadName; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getDueDate() { return dueDate; }
        public void setDueDate(String dueDate) { this.dueDate = dueDate; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
    }
}
