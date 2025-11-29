Feature: Logs Page
  As a user reviewing firing history
  I want to view and download log files
  So that I can analyze past firings

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected
    And I am on the Logs view

  @logs @list
  Scenario: View list of log files
    Then I should see a table of log files
    And each log row should show:
      | column | description                    |
      | Name   | Log filename (date_program)    |
      | Size   | File size in bytes             |
    And each log row should have View and Download buttons

  @logs @view
  Scenario: View a log file
    When I click the "View" button for a log file
    Then the log content should be displayed
    And the content should be in CSV format
    And I should be able to scroll through the content

  @logs @download
  Scenario: Download a log file
    When I click the "Download" button for a log file
    Then the browser should download the log file
    And the file should be in CSV format

  @logs @empty
  Scenario: No logs available
    Given there are no log files on the server
    Then I should see a message indicating no logs are available

